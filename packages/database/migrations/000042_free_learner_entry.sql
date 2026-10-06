-- Authenticated internal context only; anonymous public DTOs still contain no UUIDs.
CREATE FUNCTION learning_delivery.resolve_free_learning_actor_route(org_slug text, offering_slug text)
RETURNS TABLE (organization_id uuid, offering_id uuid, course_version_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT o.organization_id,o.id,o.course_version_id
    FROM learning_delivery.learning_offerings o
   WHERE o.organization_id=organizations.resolve_active_public_organization_id(org_slug)
     AND o.slug=offering_slug AND o.visibility='public' AND o.status='open'
     AND o.delivery_mode='self_paced' AND o.access_mode='membership'
     AND EXISTS (SELECT 1 FROM identity.users u
       WHERE u.id=NULLIF(current_setting('app.user_id',true),'')::uuid AND u.status='active')
$$;
REVOKE ALL ON FUNCTION learning_delivery.resolve_free_learning_actor_route(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION learning_delivery.resolve_free_learning_actor_route(text,text) TO platform_app;

-- Locator discovery does not authorize subsequent tenant reads; owner ports revalidate.
CREATE FUNCTION learning_delivery.list_own_free_learning_addresses(after_id uuid)
RETURNS TABLE (enrollment_id uuid, organization_slug text, offering_slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT e.id,g.slug,o.slug
    FROM learning_delivery.enrollments e
    JOIN learning_delivery.learning_offerings o ON o.organization_id=e.organization_id AND o.id=e.offering_id
    JOIN organizations.organizations g ON g.id=e.organization_id
    JOIN organizations.memberships m ON m.organization_id=e.organization_id AND m.user_id=e.user_id
    JOIN identity.users u ON u.id=e.user_id
   WHERE e.user_id=NULLIF(current_setting('app.user_id',true),'')::uuid
     AND u.status='active' AND g.status='active' AND m.status='active'
     AND e.status IN ('active','completed') AND (after_id IS NULL OR e.id>after_id)
     AND o.visibility='public' AND o.status='open'
     AND o.delivery_mode='self_paced' AND o.access_mode='membership'
   ORDER BY e.id LIMIT 101
$$;
REVOKE ALL ON FUNCTION learning_delivery.list_own_free_learning_addresses(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION learning_delivery.list_own_free_learning_addresses(uuid) TO platform_app;
