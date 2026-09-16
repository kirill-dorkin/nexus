package runner

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"github.com/dop251/goja"
)

const (
	interruptWall = "grader_wall_time_exceeded"
	interruptCPU  = "grader_cpu_time_exceeded"
)

type watchdog struct {
	done      chan struct{}
	once      sync.Once
	startCPU  time.Duration
	startedAt time.Time
	config    Config
}

func startWatchdog(vm *goja.Runtime, config Config) (*watchdog, error) {
	startCPU, err := processCPUTime()
	if err != nil {
		return nil, err
	}

	watch := &watchdog{
		done:      make(chan struct{}),
		startCPU:  startCPU,
		startedAt: time.Now(),
		config:    config,
	}
	wallTimer := time.AfterFunc(config.WallTime, func() {
		vm.Interrupt(interruptWall)
	})
	period := watchdogPeriod(config.CPUTime)
	go func() {
		ticker := time.NewTicker(period)
		defer ticker.Stop()
		for {
			select {
			case <-watch.done:
				return
			case <-ticker.C:
				current, cpuErr := processCPUTime()
				if cpuErr != nil {
					vm.Interrupt(cpuErr)
					return
				}
				if current-startCPU >= config.CPUTime {
					vm.Interrupt(interruptCPU)
					return
				}
			}
		}
	}()

	go func() {
		<-watch.done
		wallTimer.Stop()
	}()
	return watch, nil
}

func (watch *watchdog) stop() {
	watch.once.Do(func() { close(watch.done) })
}

func (watch *watchdog) finalLimitReason() (string, error) {
	currentCPU, err := processCPUTime()
	if err != nil {
		return "", err
	}
	if currentCPU-watch.startCPU >= watch.config.CPUTime {
		return "cpu_time_exceeded", nil
	}
	if time.Since(watch.startedAt) >= watch.config.WallTime {
		return "wall_time_exceeded", nil
	}
	return "", nil
}

func Execute(config Config) (JobResult, error) {
	previous := runtime.GOMAXPROCS(1)
	defer runtime.GOMAXPROCS(previous)

	source, sourceErr := readSource(config.SourceRoot)
	if sourceErr != nil {
		return learnerFailure(config, "source_contract_error", consolePayload{}, 0), nil
	}

	vm := goja.New()
	captureLimit := config.OutputBytes - controlReserveBytes
	capture := newBoundedCapture(captureLimit)
	if err := capture.install(vm); err != nil {
		return JobResult{}, fmt.Errorf("install console: %w", err)
	}

	watch, err := startWatchdog(vm, config)
	if err != nil {
		return JobResult{}, fmt.Errorf("start watchdog: %w", err)
	}
	defer watch.stop()

	if _, err := vm.RunScript(mainSourceFilename, string(source)); err != nil {
		if reason, interrupted, infrastructureErr := classifyInterrupt(err); interrupted {
			if infrastructureErr != nil {
				return JobResult{}, fmt.Errorf("runtime interrupt: %w", infrastructureErr)
			}
			return learnerFailure(config, reason, capture.payload(), 0), nil
		}
		return learnerFailure(config, "syntax_or_initialization_error", capture.payload(), 0), nil
	}

	solve, ok := goja.AssertFunction(vm.Get("solve"))
	if !ok {
		return learnerFailure(config, "missing_solve_function", capture.payload(), 0), nil
	}

	passed, reason, testsRun, harnessErr := runSumHarness(vm, solve)
	if harnessErr != nil {
		if interruptedReason, interrupted, infrastructureErr := classifyInterrupt(harnessErr); interrupted {
			if infrastructureErr != nil {
				return JobResult{}, fmt.Errorf("runtime interrupt: %w", infrastructureErr)
			}
			return learnerFailure(config, interruptedReason, capture.payload(), testsRun), nil
		}
		return learnerFailure(config, "runtime_error", capture.payload(), testsRun), nil
	}
	if finalReason, finalErr := watch.finalLimitReason(); finalErr != nil {
		return JobResult{}, fmt.Errorf("final CPU accounting: %w", finalErr)
	} else if finalReason != "" {
		return learnerFailure(config, finalReason, capture.payload(), testsRun), nil
	}
	if capture.truncated {
		return learnerFailure(config, "output_limit_exceeded", capture.payload(), testsRun), nil
	}
	if !passed {
		return learnerFailure(config, reason, capture.payload(), testsRun), nil
	}

	return JobResult{
		ProtocolVersion: 1,
		JobID:           config.JobID,
		Status:          "completed",
		Outcome:         "passed",
		Score:           1,
		Payload: map[string]any{
			"reason":   "passed",
			"testsRun": testsRun,
			"console":  capture.payload(),
		},
	}, nil
}

func readSource(root string) ([]byte, error) {
	rootResolved, err := filepath.EvalSymlinks(root)
	if err != nil {
		return nil, err
	}
	candidate := filepath.Join(root, mainSourceFilename)
	resolved, err := filepath.EvalSymlinks(candidate)
	if err != nil {
		return nil, err
	}
	relative, err := filepath.Rel(rootResolved, resolved)
	if err != nil || relative == ".." || filepath.IsAbs(relative) || len(relative) >= 3 && relative[:3] == ".."+string(os.PathSeparator) {
		return nil, errors.New("source path escapes trusted source root")
	}
	info, err := os.Stat(resolved)
	if err != nil || !info.Mode().IsRegular() {
		return nil, errors.New("main.js must be a regular file")
	}
	return os.ReadFile(resolved)
}

func learnerFailure(config Config, reason string, console consolePayload, testsRun int) JobResult {
	return JobResult{
		ProtocolVersion: 1,
		JobID:           config.JobID,
		Status:          "completed",
		Outcome:         "failed",
		Score:           0,
		Payload: map[string]any{
			"reason":   reason,
			"testsRun": testsRun,
			"console":  console,
		},
	}
}

func classifyInterrupt(err error) (string, bool, error) {
	var interrupted *goja.InterruptedError
	if !errors.As(err, &interrupted) {
		return "", false, nil
	}
	switch value := interrupted.Value().(type) {
	case string:
		switch value {
		case interruptWall:
			return "wall_time_exceeded", true, nil
		case interruptCPU:
			return "cpu_time_exceeded", true, nil
		default:
			return "", true, fmt.Errorf("unexpected runtime interrupt %q", value)
		}
	case error:
		return "", true, value
	default:
		return "", true, errors.New("unexpected runtime interrupt")
	}
}

func EncodeBounded(result JobResult, outputBytes int) ([]byte, error) {
	encoded, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	if len(encoded)+1 <= outputBytes {
		return append(encoded, '\n'), nil
	}

	fallback := JobResult{
		ProtocolVersion: result.ProtocolVersion,
		JobID:           result.JobID,
		Status:          "completed",
		Outcome:         "failed",
		Score:           0,
		Payload:         map[string]any{"reason": "output_limit_exceeded"},
	}
	encoded, err = json.Marshal(fallback)
	if err != nil {
		return nil, err
	}
	if len(encoded)+1 > outputBytes {
		return nil, errors.New("configured output limit cannot contain protocol result")
	}
	return append(encoded, '\n'), nil
}
