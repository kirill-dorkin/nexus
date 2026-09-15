-- F6 lifecycle trust guards.
-- Local administrator suspension must not be undone by an external GitHub
-- unsuspend event. Trusted setup may explicitly reactivate the integration.

ALTER TABLE integrations.github_installations
  ADD COLUMN suspension_source text
    CHECK (suspension_source IS NULL OR suspension_source IN ('local', 'github'));

ALTER TABLE integrations.github_webhook_lifecycle_processing
  ADD COLUMN failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0);

CREATE OR REPLACE FUNCTION platform_internal.guard_github_installation_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.status = 'suspended' THEN
    IF NEW.suspension_source IS NULL THEN
      IF session_user = 'platform_worker' THEN
        NEW.suspension_source := 'github';
      ELSE
        NEW.suspension_source := 'local';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'suspended'
    AND OLD.suspension_source = 'local'
    AND session_user = 'platform_worker'
    AND NEW.status = 'active' THEN
    NEW.status := 'suspended';
    NEW.suspension_source := 'local';
    RETURN NEW;
  END IF;

  NEW.suspension_source := NULL;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.guard_github_installation_suspension() FROM PUBLIC;

CREATE TRIGGER github_installation_suspension_guard
BEFORE UPDATE OF status, suspension_source
ON integrations.github_installations
FOR EACH ROW
EXECUTE FUNCTION platform_internal.guard_github_installation_suspension();

-- A completed trusted setup is the explicit point at which retained unmapped
-- deliveries may be re-evaluated. The original inbox routing fact remains intact.
CREATE OR REPLACE FUNCTION platform_internal.refresh_github_routes_after_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    PERFORM platform_internal.refresh_github_webhook_routes_for_installation(
      NEW.organization_id,
      NEW.github_installation_id
    );
  END IF;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.refresh_github_routes_after_setup() FROM PUBLIC;

CREATE TRIGGER github_setup_refresh_retained_routes
AFTER UPDATE OF completed_at
ON integrations.github_setup_sessions
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION platform_internal.refresh_github_routes_after_setup();

-- Claim count is operational telemetry. Only transient processor failures consume
-- the failure budget used to decide retryable versus dead-letter state.
DROP FUNCTION platform_internal.claim_github_webhook_lifecycle(uuid, integer);

CREATE FUNCTION platform_internal.claim_github_webhook_lifecycle(
  p_lease_token uuid,
  p_lease_seconds integer
)
RETURNS TABLE (
  inbox_id uuid,
  delivery_id uuid,
  event_name text,
  action text,
  github_installation_id bigint,
  github_repository_id bigint,
  payload jsonb,
  routing_status text,
  organization_id uuid,
  attempt_count integer,
  failure_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_lease_seconds < 1 OR p_lease_seconds > 900 THEN
    RAISE EXCEPTION 'GitHub lifecycle lease must be between 1 and 900 seconds'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH candidate AS (
    SELECT processing.inbox_id
    FROM integrations.github_webhook_lifecycle_processing AS processing
    JOIN integrations.github_webhook_inbox AS inbox
      ON inbox.id = processing.inbox_id
    WHERE (
      processing.status IN ('pending', 'retryable')
      AND processing.available_at <= now()
    ) OR (
      processing.status = 'processing'
      AND processing.lease_expires_at <= now()
    )
    ORDER BY inbox.received_at, inbox.id
    FOR UPDATE OF processing SKIP LOCKED
    LIMIT 1
  ),
  claimed AS (
    UPDATE integrations.github_webhook_lifecycle_processing AS processing
    SET
      status = 'processing',
      attempt_count = processing.attempt_count + 1,
      lease_token = p_lease_token,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      updated_at = now()
    FROM candidate
    WHERE processing.inbox_id = candidate.inbox_id
    RETURNING
      processing.inbox_id,
      processing.attempt_count,
      processing.failure_count
  )
  SELECT
    inbox.id,
    inbox.delivery_id,
    inbox.event_name,
    inbox.action,
    inbox.github_installation_id,
    inbox.github_repository_id,
    inbox.payload,
    route.routing_status,
    route.organization_id,
    claimed.attempt_count,
    claimed.failure_count
  FROM claimed
  JOIN integrations.github_webhook_inbox AS inbox
    ON inbox.id = claimed.inbox_id
  JOIN integrations.github_webhook_routing_state AS route
    ON route.inbox_id = claimed.inbox_id;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.claim_github_webhook_lifecycle(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.claim_github_webhook_lifecycle(uuid, integer)
  TO platform_worker;

CREATE OR REPLACE FUNCTION platform_internal.finish_github_webhook_lifecycle(
  p_inbox_id uuid,
  p_lease_token uuid,
  p_outcome text,
  p_error_code text,
  p_available_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_updated boolean;
BEGIN
  IF p_outcome NOT IN ('blocked', 'retryable', 'completed', 'rejected', 'dead_letter') THEN
    RAISE EXCEPTION 'Invalid GitHub lifecycle processing outcome'
      USING ERRCODE = '22023';
  END IF;

  IF p_error_code IS NOT NULL
    AND p_error_code !~ '^[a-z][a-z0-9_]{0,99}$' THEN
    RAISE EXCEPTION 'Invalid GitHub lifecycle processing error code'
      USING ERRCODE = '22023';
  END IF;

  UPDATE integrations.github_webhook_lifecycle_processing AS processing
  SET
    status = p_outcome,
    available_at = CASE
      WHEN p_outcome = 'retryable' THEN COALESCE(p_available_at, now())
      ELSE processing.available_at
    END,
    lease_token = NULL,
    lease_expires_at = NULL,
    failure_count = processing.failure_count
      + CASE WHEN p_outcome IN ('retryable', 'dead_letter') THEN 1 ELSE 0 END,
    last_error_code = p_error_code,
    last_error_at = CASE WHEN p_error_code IS NULL THEN NULL ELSE now() END,
    finished_at = CASE
      WHEN p_outcome IN ('completed', 'rejected', 'dead_letter') THEN now()
      ELSE NULL
    END,
    updated_at = now()
  WHERE processing.inbox_id = p_inbox_id
    AND processing.status = 'processing'
    AND processing.lease_token = p_lease_token;

  v_updated := FOUND;
  RETURN v_updated;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.finish_github_webhook_lifecycle(
  uuid, uuid, text, text, timestamptz
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.finish_github_webhook_lifecycle(
  uuid, uuid, text, text, timestamptz
) TO platform_worker;
