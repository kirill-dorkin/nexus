-- F6 lifecycle trust guards.
-- Local administrator suspension must not be undone by an external GitHub
-- unsuspend event. Trusted setup may explicitly reactivate the integration.

ALTER TABLE integrations.github_installations
  ADD COLUMN suspension_source text
    CHECK (suspension_source IS NULL OR suspension_source IN ('local', 'github'));

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
