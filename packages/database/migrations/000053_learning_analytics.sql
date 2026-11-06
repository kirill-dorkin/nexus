-- Learning analytics for the open beta (ADR-0084): how far learners get through each lesson and
-- how much active time lessons take. Anonymous visitors are counted only in daily aggregates;
-- signed-in learners also get one row per lesson with their active time, covered by the
-- privacy policy. Writes go only through the two SECURITY DEFINER functions below, which
-- validate their input; the runtime role can read under tenant RLS and cannot write directly.

CREATE SCHEMA analytics;
REVOKE ALL ON SCHEMA analytics FROM PUBLIC;
GRANT USAGE ON SCHEMA analytics TO platform_app;

CREATE TABLE analytics.lesson_daily (
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  offering_id uuid NOT NULL,
  lesson_slug text NOT NULL CHECK (
    char_length(lesson_slug) BETWEEN 2 AND 63
    AND lesson_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  day date NOT NULL,
  metric text NOT NULL CHECK (metric IN (
    'lesson_viewed', 'video_started', 'practice_run', 'signup_clicked',
    'active_seconds_anonymous', 'active_seconds_signed_in'
  )),
  value bigint NOT NULL CHECK (value >= 0),
  PRIMARY KEY (organization_id, offering_id, lesson_slug, day, metric)
);

CREATE TABLE analytics.learner_lesson_time (
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  offering_id uuid NOT NULL,
  lesson_slug text NOT NULL CHECK (
    char_length(lesson_slug) BETWEEN 2 AND 63
    AND lesson_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  active_seconds integer NOT NULL CHECK (active_seconds >= 0),
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL CHECK (last_seen_at >= first_seen_at),
  PRIMARY KEY (organization_id, user_id, offering_id, lesson_slug)
);

CREATE INDEX learner_lesson_time_offering
  ON analytics.learner_lesson_time (organization_id, offering_id, lesson_slug);

ALTER TABLE analytics.lesson_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.learner_lesson_time ENABLE ROW LEVEL SECURITY;
CREATE POLICY lesson_daily_tenant ON analytics.lesson_daily
  FOR SELECT TO platform_app
  USING (organization_id = platform_internal.current_organization_id());
CREATE POLICY learner_lesson_time_tenant ON analytics.learner_lesson_time
  FOR SELECT TO platform_app
  USING (organization_id = platform_internal.current_organization_id());
GRANT SELECT ON analytics.lesson_daily, analytics.learner_lesson_time TO platform_app;

-- Resolves a public lesson address to its organization and offering, or nothing: only lessons of
-- a currently public, open, self-paced Offering count, so the tables cannot be filled with
-- arbitrary keys. Read-only; mirrors the public lesson read of 000041.
CREATE FUNCTION analytics.resolve_public_lesson(p_org_slug text, p_offering_slug text, p_lesson_slug text)
RETURNS TABLE (organization_id uuid, offering_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT o.organization_id, o.id
    FROM learning_delivery.learning_offerings o
    JOIN learning_content.course_version_lessons vl
      ON vl.organization_id = o.organization_id AND vl.course_version_id = o.course_version_id
    JOIN learning_content.lessons l
      ON l.organization_id = vl.organization_id AND l.course_id = vl.course_id AND l.id = vl.lesson_id
   WHERE o.organization_id = organizations.resolve_active_public_organization_id(p_org_slug)
     AND o.slug = p_offering_slug AND o.visibility = 'public' AND o.status = 'open'
     AND o.delivery_mode = 'self_paced'
     AND l.slug = p_lesson_slug
$$;

-- One step on a lesson page: a view, a video start, a practice edit or a sign-up click.
-- Returns false when the address is not a public lesson.
CREATE FUNCTION analytics.record_lesson_step(
  p_org_slug text, p_offering_slug text, p_lesson_slug text, p_metric text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE target record;
BEGIN
  IF p_metric NOT IN ('lesson_viewed', 'video_started', 'practice_run', 'signup_clicked') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'unknown lesson step';
  END IF;
  SELECT * INTO target FROM analytics.resolve_public_lesson(p_org_slug, p_offering_slug, p_lesson_slug);
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO analytics.lesson_daily
    (organization_id, offering_id, lesson_slug, day, metric, value)
  VALUES (target.organization_id, target.offering_id, p_lesson_slug,
          (now() AT TIME ZONE 'UTC')::date, p_metric, 1)
  ON CONFLICT (organization_id, offering_id, lesson_slug, day, metric)
  DO UPDATE SET value = analytics.lesson_daily.value + 1;
  RETURN true;
END
$$;

-- Active seconds on a lesson page (1..60 per call); also per learner when signed in (the caller
-- passes the authenticated user id; the function checks the user is active).
CREATE FUNCTION analytics.record_active_time(
  p_org_slug text, p_offering_slug text, p_lesson_slug text, p_user_id uuid, p_seconds integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE target record; learner uuid;
BEGIN
  IF p_seconds IS NULL OR p_seconds < 1 OR p_seconds > 60 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'active seconds must be between 1 and 60';
  END IF;
  SELECT * INTO target FROM analytics.resolve_public_lesson(p_org_slug, p_offering_slug, p_lesson_slug);
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT u.id INTO learner FROM identity.users u WHERE u.id = p_user_id AND u.status = 'active';
  INSERT INTO analytics.lesson_daily
    (organization_id, offering_id, lesson_slug, day, metric, value)
  VALUES (
    target.organization_id, target.offering_id, p_lesson_slug, (now() AT TIME ZONE 'UTC')::date,
    CASE WHEN learner IS NULL THEN 'active_seconds_anonymous' ELSE 'active_seconds_signed_in' END,
    p_seconds
  )
  ON CONFLICT (organization_id, offering_id, lesson_slug, day, metric)
  DO UPDATE SET value = analytics.lesson_daily.value + EXCLUDED.value;
  IF learner IS NOT NULL THEN
    INSERT INTO analytics.learner_lesson_time
      (organization_id, user_id, offering_id, lesson_slug, active_seconds, first_seen_at, last_seen_at)
    VALUES (target.organization_id, learner, target.offering_id, p_lesson_slug, p_seconds, now(), now())
    ON CONFLICT (organization_id, user_id, offering_id, lesson_slug)
    DO UPDATE SET active_seconds = analytics.learner_lesson_time.active_seconds + EXCLUDED.active_seconds,
                  last_seen_at = now();
  END IF;
  RETURN true;
END
$$;

REVOKE ALL ON FUNCTION analytics.resolve_public_lesson(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION analytics.record_lesson_step(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION analytics.record_active_time(text, text, text, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION analytics.record_lesson_step(text, text, text, text) TO platform_app;
GRANT EXECUTE ON FUNCTION analytics.record_active_time(text, text, text, uuid, integer) TO platform_app;
