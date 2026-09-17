package runner

import (
	"reflect"
	"strconv"
	"strings"

	"github.com/dop251/goja"
)

type boundedCapture struct {
	stdout    strings.Builder
	stderr    strings.Builder
	limit     int
	used      int
	truncated bool
}

func newBoundedCapture(limit int) *boundedCapture {
	if limit < 0 {
		limit = 0
	}
	return &boundedCapture{limit: limit}
}

func (capture *boundedCapture) install(vm *goja.Runtime) error {
	console := vm.NewObject()
	if err := console.Set("log", func(call goja.FunctionCall) goja.Value {
		capture.write(false, call.Arguments)
		return goja.Undefined()
	}); err != nil {
		return err
	}
	if err := console.Set("error", func(call goja.FunctionCall) goja.Value {
		capture.write(true, call.Arguments)
		return goja.Undefined()
	}); err != nil {
		return err
	}
	return vm.Set("console", console)
}

func (capture *boundedCapture) write(stderr bool, values []goja.Value) {
	parts := make([]string, 0, len(values))
	for _, value := range values {
		parts = append(parts, safeConsoleValue(value))
	}
	line := strings.Join(parts, " ") + "\n"
	remaining := capture.limit - capture.used
	if remaining <= 0 {
		capture.truncated = true
		return
	}
	if len(line) > remaining {
		line = line[:remaining]
		capture.truncated = true
	}
	capture.used += len(line)
	if stderr {
		capture.stderr.WriteString(line)
	} else {
		capture.stdout.WriteString(line)
	}
}

func safeConsoleValue(value goja.Value) string {
	if goja.IsUndefined(value) {
		return "undefined"
	}
	if goja.IsNull(value) {
		return "null"
	}
	exportType := value.ExportType()
	if exportType == nil {
		return "[object]"
	}
	switch exportType.Kind() {
	case reflect.String:
		if typed, ok := value.Export().(string); ok {
			return typed
		}
	case reflect.Bool:
		if typed, ok := value.Export().(bool); ok {
			return strconv.FormatBool(typed)
		}
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		exported := reflect.ValueOf(value.Export())
		if exported.IsValid() && exported.Kind() >= reflect.Int && exported.Kind() <= reflect.Int64 {
			return strconv.FormatInt(exported.Int(), 10)
		}
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		exported := reflect.ValueOf(value.Export())
		if exported.IsValid() && exported.Kind() >= reflect.Uint && exported.Kind() <= reflect.Uint64 {
			return strconv.FormatUint(exported.Uint(), 10)
		}
	case reflect.Float32, reflect.Float64:
		exported := reflect.ValueOf(value.Export())
		if exported.IsValid() && (exported.Kind() == reflect.Float32 || exported.Kind() == reflect.Float64) {
			return strconv.FormatFloat(exported.Float(), 'g', -1, 64)
		}
	}
	return "[object]"
}

func (capture *boundedCapture) payload() consolePayload {
	return consolePayload{
		Stdout:    capture.stdout.String(),
		Stderr:    capture.stderr.String(),
		Truncated: capture.truncated,
	}
}
