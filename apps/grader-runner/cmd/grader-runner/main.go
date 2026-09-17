package main

import (
	"os"

	"github.com/microstudio-official/nexus/apps/grader-runner/internal/runner"
)

func main() {
	defer func() {
		if recover() != nil {
			os.Exit(70)
		}
	}()

	config, err := runner.LoadConfig(os.Args[1:], os.Getenv)
	if err != nil {
		os.Exit(78)
	}
	result, err := runner.Execute(config)
	if err != nil {
		os.Exit(70)
	}
	encoded, err := runner.EncodeBounded(result, config.OutputBytes)
	if err != nil {
		os.Exit(70)
	}
	if _, err := os.Stdout.Write(encoded); err != nil {
		os.Exit(74)
	}
}
