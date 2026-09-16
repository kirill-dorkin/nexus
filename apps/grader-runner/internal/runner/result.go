package runner

type JobResult struct {
	ProtocolVersion int            `json:"protocolVersion"`
	JobID           string         `json:"jobId"`
	Status          string         `json:"status"`
	Outcome         string         `json:"outcome"`
	Score           float64        `json:"score"`
	Payload         map[string]any `json:"payload"`
}

type consolePayload struct {
	Stdout    string `json:"stdout"`
	Stderr    string `json:"stderr"`
	Truncated bool   `json:"truncated"`
}
