-- F6 normalized GitHub Project facts.
-- Integrations keeps immutable webhook ingress and consumer delivery state; Projects
-- owns normalized immutable facts attributed through repository-binding history.

CREATE TABLE integrations.github_webhook_project_fact_processing (
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
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
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

CREATE INDEX github_webhook_project_fact_processing_claim_idx
  ON integrations.github_webhook_project_fact_processing (available_at, inbox_id)
  WHERE status IN ('pending', 'retryable');
CREATE INDEX github_webhook_project_fact_processing_lease_idx
  ON integrations.github_webhook_project_fact_processing (lease_expires_at, inbox_id)
  WHERE status = 'processing';
CREATE INDEX github_webhook_project_fact_processing_blocked_idx
  ON integrations.github_webhook_project_fact_processing (inbox_id)
  WHERE status = 'blocked';

ALTER TABLE integrations.github_webhook_project_fact_processing ENABLE ROW LEVEL SECURITY;

INSERT INTO integrations.github_webhook_project_fact_processing (inbox_id, available_at)
SELECT inbox.id, inbox.received_at
FROM integrations.github_webhook_inbox AS inbox
WHERE inbox.event_name IN ('pull_request', 'pull_request_review', 'check_run', 'check_suite')
ON CONFLICT (inbox_id) DO NOTHING;

-- Extend the existing inbox initialization hook with a separate consumer state.
-- Lifecycle and Project-fact consumers acknowledge the same immutable delivery
-- independently and cannot accidentally complete one another's work.
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

  IF NEW.event_name IN ('pull_request', 'pull_request_review', 'check_run', 'check_suite') THEN
    INSERT INTO integrations.github_webhook_project_fact_processing (
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

CREATE TABLE projects.github_project_facts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  repository_binding_id uuid NOT NULL
    REFERENCES projects.repository_bindings(id) ON DELETE RESTRICT,
  github_repository_mapping_id uuid NOT NULL
    REFERENCES integrations.github_repositories(id) ON DELETE RESTRICT,
  source_inbox_id uuid NOT NULL UNIQUE
    REFERENCES integrations.github_webhook_inbox(id) ON DELETE RESTRICT,
  source_delivery_id uuid NOT NULL UNIQUE,
  source_payload_sha256 text NOT NULL
    CHECK (source_payload_sha256 ~ '^[0-9a-f]{64}$'),
  fact_type text NOT NULL
    CHECK (fact_type IN ('pull_request', 'pull_request_review', 'check_run', 'check_suite')),
  action text NOT NULL
    CHECK (action ~ '^[a-z][a-z0-9_]{0,99}$'),
  github_repository_id bigint NOT NULL CHECK (github_repository_id > 0),
  github_object_id bigint NOT NULL CHECK (github_object_id > 0),
  github_pull_request_id bigint CHECK (github_pull_request_id IS NULL OR github_pull_request_id > 0),
  github_pull_request_number integer CHECK (github_pull_request_number IS NULL OR github_pull_request_number > 0),
  github_subject_user_id bigint CHECK (github_subject_user_id IS NULL OR github_subject_user_id > 0),
  github_subject_user_login text
    CHECK (github_subject_user_login IS NULL OR char_length(btrim(github_subject_user_login)) BETWEEN 1 AND 255),
  github_sender_user_id bigint CHECK (github_sender_user_id IS NULL OR github_sender_user_id > 0),
  github_sender_user_login text
    CHECK (github_sender_user_login IS NULL OR char_length(btrim(github_sender_user_login)) BETWEEN 1 AND 255),
  github_app_id bigint CHECK (github_app_id IS NULL OR github_app_id > 0),
  name text CHECK (name IS NULL OR char_length(btrim(name)) BETWEEN 1 AND 255),
  state text CHECK (state IS NULL OR char_length(btrim(state)) BETWEEN 1 AND 100),
  status text CHECK (status IS NULL OR char_length(btrim(status)) BETWEEN 1 AND 100),
  conclusion text CHECK (conclusion IS NULL OR char_length(btrim(conclusion)) BETWEEN 1 AND 100),
  head_sha text CHECK (head_sha IS NULL OR head_sha ~ '^[0-9a-f]{40,64}$'),
  commit_sha text CHECK (commit_sha IS NULL OR commit_sha ~ '^[0-9a-f]{40,64}$'),
  is_draft boolean,
  is_merged boolean,
  provider_created_at timestamptz,
  provider_updated_at timestamptz,
  provider_submitted_at timestamptz,
  provider_started_at timestamptz,
  provider_completed_at timestamptz,
  source_received_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES projects.projects(organization_id, id) ON DELETE CASCADE,
  CHECK (
    (fact_type = 'pull_request'
      AND github_object_id = github_pull_request_id
      AND github_pull_request_number IS NOT NULL
      AND state IS NOT NULL
      AND head_sha IS NOT NULL
      AND is_draft IS NOT NULL
      AND is_merged IS NOT NULL)
    OR (fact_type = 'pull_request_review'
      AND github_pull_request_id IS NOT NULL
      AND github_pull_request_number IS NOT NULL
      AND state IS NOT NULL
      AND commit_sha IS NOT NULL)
    OR (fact_type = 'check_run'
      AND name IS NOT NULL
      AND status IS NOT NULL
      AND head_sha IS NOT NULL)
    OR (fact_type = 'check_suite'
      AND status IS NOT NULL
      AND head_sha IS NOT NULL)
  )
);

CREATE INDEX github_project_facts_project_idx
  ON projects.github_project_facts (organization_id, project_id, source_received_at, id);
CREATE INDEX github_project_facts_repository_idx
  ON projects.github_project_facts (
    organization_id,
    github_repository_mapping_id,
    source_received_at,
    id
  );
CREATE INDEX github_project_facts_object_idx
  ON projects.github_project_facts (
    organization_id,
    project_id,
    fact_type,
    github_object_id,
    source_received_at,
    id
  );
CREATE INDEX github_project_facts_head_sha_idx
  ON projects.github_project_facts (organization_id, project_id, head_sha, source_received_at, id)
  WHERE head_sha IS NOT NULL;

ALTER TABLE projects.github_project_facts ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA projects TO platform_worker;
GRANT SELECT, INSERT ON projects.github_project_facts TO platform_worker;

CREATE POLICY github_project_facts_worker_select_policy
  ON projects.github_project_facts
  FOR SELECT
  TO platform_worker
  USING (organization_id = platform_internal.current_organization_id());

CREATE POLICY github_project_facts_worker_insert_policy
  ON projects.github_project_facts
  FOR INSERT
  TO platform_worker
  WITH CHECK (organization_id = platform_internal.current_organization_id());

-- Historical attribution is evaluated against the binding interval that contained
-- the immutable webhook receive timestamp. A later connection cannot claim older
-- repository activity, while a later disconnect cannot erase already-attributable work.
CREATE OR REPLACE FUNCTION platform_internal.resolve_project_repository_binding_at(
  p_organization_id uuid,
  p_github_repository_mapping_id uuid,
  p_source_received_at timestamptz
)
RETURNS TABLE (
  repository_binding_id uuid,
  project_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_current_organization_id uuid;
BEGIN
  v_current_organization_id := platform_internal.current_organization_id();
  IF v_current_organization_id IS NULL
    OR v_current_organization_id <> p_organization_id THEN
    RAISE EXCEPTION 'Project repository attribution requires matching organization context'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT binding.id, binding.project_id
  FROM projects.repository_bindings AS binding
  WHERE binding.organization_id = p_organization_id
    AND binding.github_repository_mapping_id = p_github_repository_mapping_id
    AND binding.connected_at <= p_source_received_at
    AND (binding.disconnected_at IS NULL OR p_source_received_at < binding.disconnected_at)
  ORDER BY binding.connected_at DESC, binding.id DESC
  LIMIT 1;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.resolve_project_repository_binding_at(
  uuid, uuid, timestamptz
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.resolve_project_repository_binding_at(
  uuid, uuid, timestamptz
) TO platform_worker;

-- Worker-only, cross-tenant claim boundary. The returned repository mapping is
-- historical identity, not current availability; mapped routing authority remains
-- authoritative even if the installation or repository is later suspended/removed.
CREATE OR REPLACE FUNCTION platform_internal.claim_github_webhook_project_fact(
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
  github_repository_mapping_id uuid,
  payload_sha256 text,
  payload jsonb,
  source_received_at timestamptz,
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
    RAISE EXCEPTION 'GitHub Project-fact lease must be between 1 and 900 seconds'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH candidate AS (
    SELECT processing.inbox_id
    FROM integrations.github_webhook_project_fact_processing AS processing
    JOIN integrations.github_webhook_inbox AS inbox
      ON inbox.id = processing.inbox_id
    JOIN integrations.github_webhook_routing_state AS route
      ON route.inbox_id = processing.inbox_id
    WHERE (
      processing.status IN ('pending', 'retryable')
      AND processing.available_at <= now()
    ) OR (
      processing.status = 'processing'
      AND processing.lease_expires_at <= now()
    ) OR (
      processing.status = 'blocked'
      AND route.routing_status = 'mapped'
    )
    ORDER BY inbox.received_at, inbox.id
    FOR UPDATE OF processing SKIP LOCKED
    LIMIT 1
  ),
  claimed AS (
    UPDATE integrations.github_webhook_project_fact_processing AS processing
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
    repository.id,
    inbox.payload_sha256,
    inbox.payload,
    inbox.received_at,
    route.routing_status,
    route.organization_id,
    claimed.attempt_count,
    claimed.failure_count
  FROM claimed
  JOIN integrations.github_webhook_inbox AS inbox
    ON inbox.id = claimed.inbox_id
  JOIN integrations.github_webhook_routing_state AS route
    ON route.inbox_id = claimed.inbox_id
  LEFT JOIN integrations.github_repositories AS repository
    ON repository.organization_id = route.organization_id
   AND repository.github_installation_id = inbox.github_installation_id
   AND repository.github_repository_id = inbox.github_repository_id;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.claim_github_webhook_project_fact(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.claim_github_webhook_project_fact(uuid, integer)
  TO platform_worker;

CREATE OR REPLACE FUNCTION platform_internal.finish_github_webhook_project_fact(
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
    RAISE EXCEPTION 'Invalid GitHub Project-fact processing outcome'
      USING ERRCODE = '22023';
  END IF;

  IF p_error_code IS NOT NULL
    AND p_error_code !~ '^[a-z][a-z0-9_]{0,99}$' THEN
    RAISE EXCEPTION 'Invalid GitHub Project-fact processing error code'
      USING ERRCODE = '22023';
  END IF;

  UPDATE integrations.github_webhook_project_fact_processing AS processing
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

REVOKE ALL ON FUNCTION platform_internal.finish_github_webhook_project_fact(
  uuid, uuid, text, text, timestamptz
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.finish_github_webhook_project_fact(
  uuid, uuid, text, text, timestamptz
) TO platform_worker;
