-- Fixed-window request counters for rate limiting (ADR-0070).
-- Keys are HMAC-SHA-256 digests computed by the API; raw IP addresses and
-- emails never reach the database. The application role can only call the
-- counting function, never read or change the rows.

CREATE TABLE platform_internal.rate_limit_buckets (
  key_sha256 bytea NOT NULL CHECK (octet_length(key_sha256) = 32),
  window_start timestamptz NOT NULL,
  hits integer NOT NULL CHECK (hits > 0),
  PRIMARY KEY (key_sha256, window_start)
);

ALTER TABLE platform_internal.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE platform_internal.rate_limit_buckets FROM PUBLIC;

CREATE INDEX rate_limit_buckets_window_start_idx
  ON platform_internal.rate_limit_buckets (window_start);

-- Counts one hit for the key in the current fixed window and returns the
-- window's total. About one call in a hundred also drops windows older than
-- a day, so the table stays small without a scheduled job.
CREATE OR REPLACE FUNCTION platform_internal.hit_rate_limit(
  p_key_sha256 bytea,
  p_window_seconds integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_window timestamptz;
  v_hits integer;
BEGIN
  IF p_key_sha256 IS NULL OR octet_length(p_key_sha256) <> 32 THEN
    RAISE EXCEPTION 'rate limit key must be a 32-byte digest'
      USING ERRCODE = '22023';
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'rate limit window must be 1..86400 seconds'
      USING ERRCODE = '22023';
  END IF;

  v_window := to_timestamp(
    floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO platform_internal.rate_limit_buckets AS bucket (key_sha256, window_start, hits)
  VALUES (p_key_sha256, v_window, 1)
  ON CONFLICT (key_sha256, window_start)
  DO UPDATE SET hits = bucket.hits + 1
  RETURNING bucket.hits INTO v_hits;

  IF random() < 0.01 THEN
    DELETE FROM platform_internal.rate_limit_buckets
    WHERE window_start < clock_timestamp() - interval '1 day';
  END IF;

  RETURN v_hits;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.hit_rate_limit(bytea, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.hit_rate_limit(bytea, integer) TO platform_app;
