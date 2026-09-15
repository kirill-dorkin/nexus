-- F6 GitHub webhook lifecycle processing.
-- Received webhook inbox rows remain immutable source facts. Mutable routing and
-- processor state live separately and are executed by the platform worker role.

ALTER TABLE integrations.github_repositories
  DROP CONSTRAINT github_repositories_status_check;
ALTER TABLE integrations.github_repositories
  ADD CONSTRAINT github_repositories_status_check
  CHECK (status IN ('active', 'suspended', 'removed'));

CREATE TABLE integrations.github_webhook_routing_state (
  inbox_id uuid PRIMARY KEY
    REFERENCES integrations.github_webhook_inbox(id) ON DELETE CASCADE,
  organization_id uuid
    REFERENCES organizations.organizations(id) ON DELETE SET NULL,
  routing_status text NOT NULL
    CHECK (routing_status IN (
      'mapped',
      'unmapped_installation',
      'unmapped_repository',
      'repository_mismatch',
      'not_applicable'
    )),
  evaluation_count integer NOT NULL DEFAULT 1 CHECK (evaluation_count > 0),
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (routing_status <> 'mapped' OR organization_id IS NOT NULL),
  CHECK (routing_status <> 'not_applicable' OR organization_id IS NULL)
);

CREATE TABLE integrations.github_webhook_lifecycle_processing (
  inbox_id uuid PRIMARY KEY
    REFERENCES integrations.github_webhook_inbox(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'processing',
      'blocked',
      'retryable',
      'completed',
      'rejected',
      'dead_letter'
    )),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error_code text
    CHECK (
      last_error_code IS NULL
      OR last_error_code ~ '^[a-z][a-z0-9_]{0,99}$'
    ),
  last_error_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status = 'processing' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR (status <> 'processing' AND lease_token IS NULL AND lease_expires_at IS NULL)
  ),
  CHECK (
    (status IN ('completed', 'rejected', 'dead_letter') AND finished_at IS NOT NULL)
    OR (status NOT IN ('completed', 'rejected', 'dead_letter') AND finished_at IS NULL)
  )
);

CREATE INDEX github_webhook_routing_state_status_idx
  ON integrations.github_webhook_routing_state (routing_status, evaluated_at, inbox_id);
CREATE INDEX github_webhook_lifecycle_processing_claim_idx
  ON integrations.github_webhook_lifecycle_processing (available_at, inbox_id)
  WHERE status IN ('pending', 'retryable');
CREATE INDEX github_webhook_lifecycle_processing_lease_idx
  ON integrations.github_webhook_lifecycle_processing (lease_expires_at, inbox_id)
  WHERE status = 'processing';

ALTER TABLE integrations.github_webhook_routing_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.github_webhook_lifecycle_processing ENABLE ROW LEVEL SECURITY;

INSERT INTO integrations.github_webhook_routing_state (
  inbox_id,
  organization_id,
  routing_status,
  evaluated_at,
  updated_at
)
SELECT
  inbox.id,
  inbox.organization_id,
  inbox.routing_status,
  inbox.received_at,
  inbox.received_at
FROM integrations.github_webhook_inbox AS inbox
ON CONFLICT (inbox_id) DO NOTHING;

INSERT INTO integrations.github_webhook_lifecycle_processing (inbox_id, available_at)
SELECT inbox.id, inbox.received_at
FROM integrations.github_webhook_inbox AS inbox
WHERE inbox.event_name IN ('installation', 'installation_repositories')
ON CONFLICT (inbox_id) DO NOTHING;

CREATE OR REPLACE FUNCTION platform_internal.initialize_github_webhook_processing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO integrations.github_webhook_routing_state (
    inbox_id,
    organization_id,
    routing_status,
    evaluated_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.organization_id,
    NEW.routing_status,
    NEW.received_at,
    NEW.received_at
  )
  ON CONFLICT (inbox_id) DO NOTHING;

  IF NEW.event_name IN ('installation', 'installation_repositories') THEN
    INSERT INTO integrations.github_webhook_lifecycle_processing (
      inbox_id,
      available_at
    )
    VALUES (NEW.id, NEW.received_at)
    ON CONFLICT (inbox_id) DO NOTHING;
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.initialize_github_webhook_processing() FROM PUBLIC;

CREATE TRIGGER github_webhook_processing_initialize
AFTER INSERT ON integrations.github_webhook_inbox
FOR EACH ROW
EXECUTE FUNCTION platform_internal.initialize_github_webhook_processing();

-- The worker may mutate Integration-owned mapping state only inside a transaction
-- carrying the exact organization context returned by the claim boundary.
GRANT USAGE ON SCHEMA integrations TO platform_worker;
GRANT SELECT, INSERT, UPDATE ON integrations.github_installations TO platform_worker;
GRANT SELECT, INSERT, UPDATE ON integrations.github_repositories TO platform_worker;

CREATE POLICY github_installations_worker_tenant_policy
  ON integrations.github_installations
  FOR ALL
  TO platform_worker
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY github_repositories_worker_tenant_policy
  ON integrations.github_repositories
  FOR ALL
  TO platform_worker
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

-- Re-evaluation is deliberately limited to retained deliveries that were not
-- tenant-routable at receive time (or at a prior explicit recheck). Historical
-- mapped authority is never silently revoked by later mapping changes.
CREATE OR REPLACE FUNCTION platform_internal.refresh_github_webhook_routes_for_installation(
  p_organization_id uuid,
  p_github_installation_id bigint
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_current_organization_id uuid;
  v_changed integer := 0;
BEGIN
  v_current_organization_id := platform_internal.current_organization_id();
  IF v_current_organization_id IS NULL
    OR v_current_organization_id <> p_organization_id THEN
    RAISE EXCEPTION 'GitHub route refresh requires matching organization context'
      USING ERRCODE = '42501';
  END IF;

  PERFORM 1
  FROM integrations.github_installations AS installation
  WHERE installation.organization_id = p_organization_id
    AND installation.github_installation_id = p_github_installation_id
    AND installation.status = 'active';

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  WITH candidates AS (
    SELECT
      route.inbox_id,
      inbox.github_repository_id,
      repository.organization_id AS repository_organization_id,
      repository.github_installation_id AS repository_installation_id
    FROM integrations.github_webhook_routing_state AS route
    JOIN integrations.github_webhook_inbox AS inbox
      ON inbox.id = route.inbox_id
    LEFT JOIN integrations.github_repositories AS repository
      ON repository.github_repository_id = inbox.github_repository_id
     AND repository.status = 'active'
    WHERE inbox.github_installation_id = p_github_installation_id
      AND route.routing_status IN ('unmapped_installation', 'unmapped_repository')
  ),
  evaluated AS (
    SELECT
      candidate.inbox_id,
      CASE
        WHEN candidate.github_repository_id IS NULL THEN 'mapped'
        WHEN candidate.repository_organization_id IS NULL THEN 'unmapped_repository'
        WHEN candidate.repository_organization_id <> p_organization_id
          OR candidate.repository_installation_id <> p_github_installation_id
          THEN 'repository_mismatch'
        ELSE 'mapped'
      END AS routing_status,
      CASE
        WHEN candidate.github_repository_id IS NULL THEN p_organization_id
        WHEN candidate.repository_organization_id = p_organization_id
          AND candidate.repository_installation_id = p_github_installation_id
          THEN p_organization_id
        ELSE NULL::uuid
      END AS organization_id
    FROM candidates AS candidate
  )
  UPDATE integrations.github_webhook_routing_state AS route
  SET
    organization_id = evaluated.organization_id,
    routing_status = evaluated.routing_status,
    evaluation_count = route.evaluation_count + 1,
    evaluated_at = now(),
    updated_at = now()
  FROM evaluated
  WHERE route.inbox_id = evaluated.inbox_id
    AND (
      route.routing_status IS DISTINCT FROM evaluated.routing_status
      OR route.organization_id IS DISTINCT FROM evaluated.organization_id
    );

  GET DIAGNOSTICS v_changed = ROW_COUNT;

  UPDATE integrations.github_webhook_lifecycle_processing AS processing
  SET
    status = 'pending',
    available_at = now(),
    last_error_code = NULL,
    last_error_at = NULL,
    updated_at = now()
  FROM integrations.github_webhook_routing_state AS route,
       integrations.github_webhook_inbox AS inbox
  WHERE processing.inbox_id = route.inbox_id
    AND inbox.id = route.inbox_id
    AND inbox.github_installation_id = p_github_installation_id
    AND route.organization_id = p_organization_id
    AND route.routing_status = 'mapped'
    AND processing.status = 'blocked';

  RETURN v_changed;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.refresh_github_webhook_routes_for_installation(
  uuid, bigint
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.refresh_github_webhook_routes_for_installation(
  uuid, bigint
) TO platform_app, platform_worker;

CREATE OR REPLACE FUNCTION platform_internal.claim_github_webhook_lifecycle(
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
  attempt_count integer
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
    RETURNING processing.inbox_id, processing.attempt_count
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
    claimed.attempt_count
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
