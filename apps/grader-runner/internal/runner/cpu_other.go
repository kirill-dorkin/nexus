//go:build !linux && !darwin

package runner

import (
	"errors"
	"time"
)

func processCPUTime() (time.Duration, error) {
	return 0, errors.New("process CPU accounting is unsupported on this platform")
}
