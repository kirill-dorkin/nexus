-- F6 GitHub integration ingress foundation.
-- Verified GitHub webhook deliveries become append-only inbox facts. Tenant routing
-- is resolved only from trusted installation/repository mappings; the API runtime
-- receives no direct cross-tenant table privileges.

CREATE SCHEMA integrations;
REVOKE ALL ON SCHEMA integrations FROM PUBLIC;

CREATE TABLE integrations.github_installations (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  github_installation_id bigint NOT NULL CHECK (github_installation_id > 0),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (github_installation_id),
  UNIQUE (organization_id, github_installation_id)
);

CREATE TABLE integrations.github_repositories (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  github_installation_id bigint NOT NULL CHECK (github_installation_id > 0),
  github_repository_id bigint NOT NULL CHECK (github_repository_id > 0),
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 3 AND 260),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, github_installation_id)
    REFERENCES integrations.github_installations(organization_id, github_installation_id)
    ON DELETE CASCADE,
  UNIQUE (github_repository_id),
  UNIQUE (organization_id, github_repository_id)
);

CREATE TABLE integrations.github_webhook_inbox (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid
    REFERENCES organizations.organizations(id) ON DELETE SET NULL,
  delivery_id uuid NOT NULL UNIQUE,
  event_name text NOT NULL
    CHECK (event_name ~ '^[a-z][a-z0-9_]{0,63}$'),
  action text CHECK (action IS NULL OR char_length(action) BETWEEN 1 AND 100),
  github_installation_id bigint CHECK (github_installation_id IS NULL OR github_installation_id > 0),
  github_repository_id bigint CHECK (github_repository_id IS NULL OR github_repository_id > 0),
  routing_status text NOT NULL
    CHECK (routing_status IN (
      'mapped',
      'unmapped_installation',
      'unmapped_repository',
      'repository_mismatch',
      'not_applicable'
    )),
  payload_sha256 text NOT NULL
    CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  received_at timestamptz NOT NULL DEFAULT now(),
  CHECK (routing_status <> 'mapped' OR (
    organization_id IS NOT NULL AND github_installation_id IS NOT NULL
  )),
  CHECK (routing_status <> 'not_applicable' OR (
    organization_id IS NULL
    AND github_installation_id IS NULL
    AND github_repository_id IS NULL
  ))
);

CREATE INDEX github_installations_organization_idx
  ON integrations.github_installations (organization_id, github_installation_id);
CREATE INDEX github_repositories_organization_idx
  ON integrations.github_repositories (organization_id, github_repository_id);
CREATE INDEX github_webhook_inbox_routing_idx
  ON integrations.github_webhook_inbox (routing_status, received_at, id);
CREATE INDEX github_webhook_inbox_organization_idx
  ON integrations.github_webhook_inbox (organization_id, received_at, id)
  WHERE organization_id IS NOT NULL;

ALTER TABLE integrations.github_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.github_webhook_inbox ENABLE ROW LEVEL SECURITY;

-- The public API role intentionally gets no direct grants on integrations tables.
-- This SECURITY DEFINER function is the narrow cross-tenant ingress boundary: it
-- resolves only exact external ids and atomically deduplicates the delivery.
CREATE OR REPLACE FUNCTION platform_internal.ingest_github_webhook(
  p_delivery_id uuid,
  p_event_name text,
  p_action text,
  p_github_installation_id bigint,
  p_github_repository_id bigint,
  p_payload_sha256 text,
  p_payload jsonb
)
RETURNS TABLE (
  inserted boolean,
  routing_status text,
  organization_id uuid,
  existing_payload_sha256 text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_organization_id uuid;
  v_repository_organization_id uuid;
  v_repository_installation_id bigint;
  v_routing_status text;
  v_existing_payload_sha256 text;
BEGIN
  IF p_github_installation_id IS NULL THEN
    IF p_github_repository_id IS NULL THEN
      v_routing_status := 'not_applicable';
    ELSE
      v_routing_status := 'unmapped_installation';
    END IF;
  ELSE
    SELECT installation.organization_id
      INTO v_organization_id
      FROM integrations.github_installations AS installation
      WHERE installation.github_installation_id = p_github_installation_id
        AND installation.status = 'active';

    IF v_organization_id IS NULL THEN
      v_routing_status := 'unmapped_installation';
    ELSIF p_github_repository_id IS NULL THEN
      v_routing_status := 'mapped';
    ELSE
      SELECT repository.organization_id, repository.github_installation_id
        INTO v_repository_organization_id, v_repository_installation_id
        FROM integrations.github_repositories AS repository
        WHERE repository.github_repository_id = p_github_repository_id
          AND repository.status = 'active';

      IF v_repository_organization_id IS NULL THEN
        v_routing_status := 'unmapped_repository';
      ELSIF v_repository_organization_id <> v_organization_id
        OR v_repository_installation_id <> p_github_installation_id THEN
        v_routing_status := 'repository_mismatch';
      ELSE
        v_routing_status := 'mapped';
      END IF;
    END IF;
  END IF;

  INSERT INTO integrations.github_webhook_inbox (
    organization_id,
    delivery_id,
    event_name,
    action,
    github_installation_id,
    github_repository_id,
    routing_status,
    payload_sha256,
    payload
  )
  VALUES (
    v_organization_id,
    p_delivery_id,
    p_event_name,
    p_action,
    p_github_installation_id,
    p_github_repository_id,
    v_routing_status,
    p_payload_sha256,
    p_payload
  )
  ON CONFLICT (delivery_id) DO NOTHING;

  IF FOUND THEN
    RETURN QUERY
      SELECT true, v_routing_status, v_organization_id, NULL::text;
    RETURN;
  END IF;

  SELECT inbox.payload_sha256
    INTO v_existing_payload_sha256
    FROM integrations.github_webhook_inbox AS inbox
    WHERE inbox.delivery_id = p_delivery_id;

  RETURN QUERY
    SELECT
      false,
      inbox.routing_status,
      inbox.organization_id,
      v_existing_payload_sha256
    FROM integrations.github_webhook_inbox AS inbox
    WHERE inbox.delivery_id = p_delivery_id;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.ingest_github_webhook(
  uuid, text, text, bigint, bigint, text, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.ingest_github_webhook(
  uuid, text, text, bigint, bigint, text, jsonb
) TO platform_app;
