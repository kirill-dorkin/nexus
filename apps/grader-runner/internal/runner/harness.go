package runner

import (
	"math"

	"github.com/dop251/goja"
)

type sumCase struct {
	A        float64
	B        float64
	Expected float64
}

var sumCases = [...]sumCase{
	{A: 2, B: 3, Expected: 5},
	{A: -7, B: 4, Expected: -3},
	{A: 0, B: 0, Expected: 0},
	{A: 0.25, B: 0.5, Expected: 0.75},
	{A: 1024, B: -24, Expected: 1000},
}

func runSumHarness(vm *goja.Runtime, solve goja.Callable) (bool, string, int, error) {
	for index, testCase := range sumCases {
		input := map[string]any{"a": testCase.A, "b": testCase.B}
		value, err := solve(goja.Undefined(), vm.ToValue(input))
		if err != nil {
			return false, "runtime_error", index, err
		}
		if !matchesNumber(value.Export(), testCase.Expected) {
			return false, "test_failed", index + 1, nil
		}
	}
	return true, "passed", len(sumCases), nil
}

func matchesNumber(value any, expected float64) bool {
	var actual float64
	switch typed := value.(type) {
	case int:
		actual = float64(typed)
	case int32:
		actual = float64(typed)
	case int64:
		actual = float64(typed)
	case float32:
		actual = float64(typed)
	case float64:
		actual = typed
	default:
		return false
	}
	return !math.IsNaN(actual) && !math.IsInf(actual, 0) && actual == expected
}
