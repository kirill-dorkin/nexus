-- Local e2e database next to the development one, so end-to-end runs never
-- write into `platform`. Run once as the local superuser:
--   PGPASSWORD=local_postgres_admin psql -h 127.0.0.1 -U postgres -f tests/e2e/local-database.sql
-- The roles come from infra/postgres/init/001-runtime-roles.sql.

CREATE DATABASE platform_e2e OWNER platform_migrator;

\connect platform_e2e

REVOKE ALL ON DATABASE platform_e2e FROM PUBLIC;
GRANT CONNECT ON DATABASE platform_e2e TO platform_app, platform_worker;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER DATABASE platform_e2e SET timezone TO 'UTC';
