-- Narrow runtime UPDATE privileges to lifecycle/presentation fields.
-- Structural identity columns remain migration-owned and are also protected by 000011 triggers.

REVOKE UPDATE ON learning_delivery.learning_offerings FROM platform_app;
GRANT UPDATE (
  slug,
  name,
  access_mode,
  status,
  starts_at,
  ends_at,
  updated_at
) ON learning_delivery.learning_offerings TO platform_app;

REVOKE UPDATE ON learning_delivery.enrollments FROM platform_app;
GRANT UPDATE (
  status,
  completed_at,
  updated_at
) ON learning_delivery.enrollments TO platform_app;

REVOKE UPDATE ON learning_delivery.course_runs FROM platform_app;
GRANT UPDATE (
  slug,
  name,
  starts_at,
  ends_at,
  updated_at
) ON learning_delivery.course_runs TO platform_app;

REVOKE UPDATE ON learning_delivery.group_sets FROM platform_app;
GRANT UPDATE (
  slug,
  name,
  updated_at
) ON learning_delivery.group_sets TO platform_app;

REVOKE UPDATE ON learning_delivery.groups FROM platform_app;
GRANT UPDATE (
  slug,
  name,
  updated_at
) ON learning_delivery.groups TO platform_app;

REVOKE UPDATE ON learning_delivery.group_memberships FROM platform_app;
GRANT UPDATE (
  ended_at,
  updated_at
) ON learning_delivery.group_memberships TO platform_app;

REVOKE UPDATE ON learning_delivery.sessions FROM platform_app;
GRANT UPDATE (
  group_id,
  slug,
  name,
  starts_at,
  ends_at,
  updated_at
) ON learning_delivery.sessions TO platform_app;

REVOKE UPDATE ON learning_delivery.attendances FROM platform_app;
GRANT UPDATE (
  status,
  updated_by_user_id
) ON learning_delivery.attendances TO platform_app;
