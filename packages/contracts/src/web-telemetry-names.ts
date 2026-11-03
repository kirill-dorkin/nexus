// Plain data without zod, so the Web client can use it without loading the
// validation library on every page (ADR-0067).
export const WEB_ERROR_NAMES = [
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "URIError",
  "EvalError",
  "AggregateError",
  "AbortError",
  "ChunkLoadError",
  "NetworkError",
  "NotAllowedError",
  "QuotaExceededError",
  "SecurityError",
  "TimeoutError",
  "non_error",
  "other"
] as const;
