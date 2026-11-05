-- The skill map in Learning Content (ADR-0078): characters, branches and skill prerequisites as
-- published immutable versions, like courses. Additive: nothing reads these tables until the API
-- starts importing `skill-map@2` manifests; Web keeps its bundled map until then.

CREATE TABLE learning_content.skill_maps (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (
    char_length(slug) BETWEEN 2 AND 63
    AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug),
  UNIQUE (organization_id, id)
);

-- The whole map of a version is one validated document (characters, branches, membership, story
-- references, coverage indexes); prerequisites are also normalized below for server-side checks.
CREATE TABLE learning_content.skill_map_versions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  skill_map_id uuid NOT NULL,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  document jsonb NOT NULL CHECK (
    jsonb_typeof(document) = 'object'
    AND document ->> 'schemaVersion' = '2'
    AND jsonb_typeof(document -> 'characters') = 'array'
  ),
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  published_by_user_id uuid REFERENCES identity.users(id) ON DELETE RESTRICT,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, skill_map_id)
    REFERENCES learning_content.skill_maps (organization_id, id)
    ON DELETE CASCADE,
  UNIQUE (skill_map_id, version_number),
  UNIQUE (organization_id, id),
  CHECK (
    (status = 'draft' AND published_at IS NULL AND published_by_user_id IS NULL)
    OR (status = 'published' AND published_at IS NOT NULL AND published_by_user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX skill_map_versions_one_draft
  ON learning_content.skill_map_versions (skill_map_id)
  WHERE status = 'draft';

-- A published version never changes; a draft may change and be published once.
CREATE FUNCTION learning_content.protect_skill_map_version()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'published' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'published skill map versions are immutable';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'published'
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.skill_map_id IS DISTINCT FROM OLD.skill_map_id
     OR NEW.version_number IS DISTINCT FROM OLD.version_number THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'published skill map versions are immutable';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION learning_content.protect_skill_map_version() FROM PUBLIC;

CREATE TRIGGER skill_map_versions_protect
  BEFORE UPDATE OR DELETE ON learning_content.skill_map_versions
  FOR EACH ROW EXECUTE FUNCTION learning_content.protect_skill_map_version();

-- Skill → skill it stands on, per map version (ADR-0077 reads these).
CREATE TABLE learning_content.skill_map_prerequisites (
  organization_id uuid NOT NULL,
  skill_map_version_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  requires_skill_id uuid NOT NULL,
  PRIMARY KEY (skill_map_version_id, skill_id, requires_skill_id),
  CHECK (skill_id <> requires_skill_id),
  FOREIGN KEY (organization_id, skill_map_version_id)
    REFERENCES learning_content.skill_map_versions (organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, skill_id)
    REFERENCES learning_content.skills (organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, requires_skill_id)
    REFERENCES learning_content.skills (organization_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX skill_map_prerequisites_skill
  ON learning_content.skill_map_prerequisites (organization_id, skill_map_version_id, skill_id);

-- Prerequisites change only while their version is a draft.
CREATE FUNCTION learning_content.require_draft_skill_map_version()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
DECLARE version_status text;
BEGIN
  SELECT status INTO version_status FROM learning_content.skill_map_versions
   WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
     AND id = COALESCE(NEW.skill_map_version_id, OLD.skill_map_version_id)
     FOR UPDATE;
  IF version_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'published skill map versions are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION learning_content.require_draft_skill_map_version() FROM PUBLIC;

CREATE TRIGGER skill_map_prerequisites_require_draft
  BEFORE INSERT OR UPDATE OR DELETE ON learning_content.skill_map_prerequisites
  FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_skill_map_version();

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['skill_maps', 'skill_map_versions', 'skill_map_prerequisites'] LOOP
    EXECUTE format('ALTER TABLE learning_content.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON learning_content.%I FOR ALL TO platform_app '
      'USING (organization_id = platform_internal.current_organization_id()) '
      'WITH CHECK (organization_id = platform_internal.current_organization_id())',
      t || '_tenant', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT ON learning_content.skill_maps TO platform_app;
GRANT SELECT, INSERT, DELETE ON learning_content.skill_map_versions TO platform_app;
GRANT UPDATE (status, document, published_by_user_id, published_at)
  ON learning_content.skill_map_versions TO platform_app;
GRANT SELECT, INSERT, DELETE ON learning_content.skill_map_prerequisites TO platform_app;

-- Public read for Web: the latest published document of an active organization's map.
CREATE FUNCTION learning_content.read_public_skill_map(org_slug text, map_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT v.document
    FROM organizations.organizations o
    JOIN learning_content.skill_maps m ON m.organization_id = o.id AND m.slug = map_slug
    JOIN learning_content.skill_map_versions v
      ON v.organization_id = m.organization_id AND v.skill_map_id = m.id AND v.status = 'published'
   WHERE o.slug = org_slug AND o.status = 'active'
   ORDER BY v.version_number DESC
   LIMIT 1
$$;
REVOKE ALL ON FUNCTION learning_content.read_public_skill_map(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION learning_content.read_public_skill_map(text, text) TO platform_app;
