-- Actor-bound locator discovery only. No role/curriculum/answer data or write authority.
CREATE FUNCTION organizations.list_own_active_organizations(after_id uuid)
RETURNS TABLE (id uuid, slug text, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT o.id,o.slug,o.name
    FROM organizations.organizations o
    JOIN organizations.memberships m ON m.organization_id=o.id
    JOIN identity.users u ON u.id=m.user_id
   WHERE m.user_id=NULLIF(current_setting('app.user_id',true),'')::uuid
     AND u.status='active' AND m.status='active' AND o.status='active'
     AND (after_id IS NULL OR o.id>after_id)
   ORDER BY o.id LIMIT 101
$$;
REVOKE ALL ON FUNCTION organizations.list_own_active_organizations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizations.list_own_active_organizations(uuid) TO platform_app;
