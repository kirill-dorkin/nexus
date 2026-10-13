package runner

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	modeJSSumV1           = "js-sum-v1"
	mainSourceFilename    = "main.js"
	minimumControlBytes   = 1024
	controlReserveBytes   = 512
	minimumWatchdogPeriod = time.Millisecond
	maximumWatchdogPeriod = 5 * time.Millisecond
)

type Config struct {
	JobID       string
	SourceRoot  string
	ScratchRoot string
	WallTime    time.Duration
	CPUTime     time.Duration
	PIDLimit    int
	OutputBytes int
	Mode        string
}

func LoadConfig(args []string, getenv func(string) string) (Config, error) {
	if len(args) != 1 || args[0] != modeJSSumV1 {
		return Config{}, errors.New("exactly one supported runner mode is required")
	}

	jobID := strings.TrimSpace(getenv("GRADER_JOB_ID"))
	if !validJobID(jobID) {
		return Config{}, errors.New("GRADER_JOB_ID is invalid")
	}

	sourceRoot, err := absoluteDirectory(getenv("GRADER_SOURCE_ROOT"), "GRADER_SOURCE_ROOT")
	if err != nil {
		return Config{}, err
	}
	scratchRoot, err := absoluteDirectory(getenv("GRADER_SCRATCH_ROOT"), "GRADER_SCRATCH_ROOT")
	if err != nil {
		return Config{}, err
	}
	if sourceRoot == scratchRoot {
		return Config{}, errors.New("source and scratch roots must be distinct")
	}

	wallMillis, err := positiveInt(getenv("GRADER_WALL_TIME_MS"), "GRADER_WALL_TIME_MS")
	if err != nil {
		return Config{}, err
	}
	cpuMillis, err := positiveInt(getenv("GRADER_CPU_TIME_MS"), "GRADER_CPU_TIME_MS")
	if err != nil {
		return Config{}, err
	}
	if cpuMillis > wallMillis {
		return Config{}, errors.New("CPU limit must not exceed wall limit")
	}
	pidLimit, err := positiveInt(getenv("GRADER_PIDS"), "GRADER_PIDS")
	if err != nil {
		return Config{}, err
	}
	outputBytes, err := positiveInt(getenv("GRADER_OUTPUT_BYTES"), "GRADER_OUTPUT_BYTES")
	if err != nil {
		return Config{}, err
	}
	if outputBytes < minimumControlBytes {
		return Config{}, fmt.Errorf("GRADER_OUTPUT_BYTES must be at least %d", minimumControlBytes)
	}

	return Config{
		JobID:       jobID,
		SourceRoot:  sourceRoot,
		ScratchRoot: scratchRoot,
		WallTime:    time.Duration(wallMillis) * time.Millisecond,
		CPUTime:     time.Duration(cpuMillis) * time.Millisecond,
		PIDLimit:    pidLimit,
		OutputBytes: outputBytes,
		Mode:        args[0],
	}, nil
}

func positiveInt(raw string, name string) (int, error) {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("%s must be a positive integer", name)
	}
	return value, nil
}

func absoluteDirectory(raw string, name string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" || !filepath.IsAbs(value) {
		return "", fmt.Errorf("%s must be an absolute directory", name)
	}
	clean := filepath.Clean(value)
	info, err := os.Stat(clean)
	if err != nil || !info.IsDir() {
		return "", fmt.Errorf("%s must reference an existing directory", name)
	}
	return clean, nil
}

func validJobID(value string) bool {
	const prefix = "sha256:"
	if !strings.HasPrefix(value, prefix) || len(value) != len(prefix)+64 {
		return false
	}
	for _, character := range value[len(prefix):] {
		if (character < '0' || character > '9') && (character < 'a' || character > 'f') {
			return false
		}
	}
	return true
}

func watchdogPeriod(limit time.Duration) time.Duration {
	period := limit / 20
	if period < minimumWatchdogPeriod {
		return minimumWatchdogPeriod
	}
	if period > maximumWatchdogPeriod {
		return maximumWatchdogPeriod
	}
	return period
}
