package runner

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func testConfig(t *testing.T, source string) Config {
	t.Helper()
	sourceRoot := t.TempDir()
	scratchRoot := t.TempDir()
	if err := os.WriteFile(filepath.Join(sourceRoot, mainSourceFilename), []byte(source), 0o444); err != nil {
		t.Fatal(err)
	}
	return Config{
		JobID:       "sha256:" + strings.Repeat("a", 64),
		SourceRoot:  sourceRoot,
		ScratchRoot: scratchRoot,
		WallTime:    250 * time.Millisecond,
		CPUTime:     200 * time.Millisecond,
		PIDLimit:    64,
		OutputBytes: 16 * 1024,
		Mode:        modeJSSumV1,
	}
}

func TestExecutePassesExactHiddenHarness(t *testing.T) {
	config := testConfig(t, `
function solve(input) {
  console.log("running", input.a);
  return input.a + input.b;
}
`)
	result, err := Execute(config)
	if err != nil {
		t.Fatal(err)
	}
	if result.Outcome != "passed" || result.Score != 1 {
		t.Fatalf("unexpected result: %#v", result)
	}
	payloadConsole := result.Payload["console"].(consolePayload)
	if !strings.Contains(payloadConsole.Stdout, "running") || payloadConsole.Stderr != "" {
		t.Fatalf("unexpected console payload: %#v", payloadConsole)
	}
}

func TestExecuteClassifiesLearnerFailuresWithoutSystemFailure(t *testing.T) {
	tests := map[string]struct {
		source string
		reason string
	}{
		"syntax":  {source: `function solve( {`, reason: "syntax_or_initialization_error"},
		"missing": {source: `var answer = 42;`, reason: "missing_solve_function"},
		"wrong":   {source: `function solve(input) { return input.a - input.b; }`, reason: "test_failed"},
		"runtime": {source: `function solve(input) { throw new Error("learner"); }`, reason: "runtime_error"},
	}
	for name, testCase := range tests {
		t.Run(name, func(t *testing.T) {
			result, err := Execute(testConfig(t, testCase.source))
			if err != nil {
				t.Fatal(err)
			}
			if result.Status != "completed" || result.Outcome != "failed" || result.Score != 0 {
				t.Fatalf("unexpected result: %#v", result)
			}
			if result.Payload["reason"] != testCase.reason {
				t.Fatalf("reason = %v, want %s", result.Payload["reason"], testCase.reason)
			}
		})
	}
}

func TestExecuteEnforcesWallAndCPUBudgets(t *testing.T) {
	source := `function solve(input) { for (;;) {} }`
	config := testConfig(t, source)
	config.WallTime = 80 * time.Millisecond
	config.CPUTime = 40 * time.Millisecond
	result, err := Execute(config)
	if err != nil {
		t.Fatal(err)
	}
	if result.Outcome != "failed" {
		t.Fatalf("unexpected result: %#v", result)
	}
	reason, _ := result.Payload["reason"].(string)
	if reason != "cpu_time_exceeded" && reason != "wall_time_exceeded" {
		t.Fatalf("unexpected limit reason: %q", reason)
	}
}

func TestExecuteBoundsLearnerConsoleAndControlDocument(t *testing.T) {
	config := testConfig(t, `
function solve(input) {
  for (var i = 0; i < 10000; i++) console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  return input.a + input.b;
}
`)
	config.OutputBytes = 2048
	result, err := Execute(config)
	if err != nil {
		t.Fatal(err)
	}
	if result.Payload["reason"] != "output_limit_exceeded" {
		t.Fatalf("unexpected result: %#v", result)
	}
	encoded, err := EncodeBounded(result, config.OutputBytes)
	if err != nil {
		t.Fatal(err)
	}
	if len(encoded) > config.OutputBytes {
		t.Fatalf("encoded result is %d bytes, limit is %d", len(encoded), config.OutputBytes)
	}
	var decoded map[string]any
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("control output is not one JSON document: %v", err)
	}
}

func TestLearnerRuntimeDoesNotExposeNodeOrHostCapabilities(t *testing.T) {
	for name, expression := range map[string]string{
		"process":   `process`,
		"require":   `require`,
		"fetch":     `fetch`,
		"websocket": `WebSocket`,
	} {
		t.Run(name, func(t *testing.T) {
			config := testConfig(t, `function solve(input) { return `+expression+`; }`)
			result, err := Execute(config)
			if err != nil {
				t.Fatal(err)
			}
			if result.Outcome != "failed" || result.Payload["reason"] != "runtime_error" {
				t.Fatalf("unexpected capability result: %#v", result)
			}
		})
	}
}
