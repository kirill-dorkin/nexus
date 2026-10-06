#!/bin/sh
set -eu
# psql safely quotes variables; credentials never enter command-line arguments.
PGPASSWORD=$(cat /run/secrets/database_admin_password)
export PGPASSWORD
APP_PASSWORD=$(cat /run/secrets/database_app_password)
MIGRATION_PASSWORD=$(cat /run/secrets/database_migration_password)
WORKER_PASSWORD=$(cat /run/secrets/database_worker_password)
export APP_PASSWORD MIGRATION_PASSWORD WORKER_PASSWORD
psql -X --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 <<'SQL'
\getenv app_password APP_PASSWORD
\getenv migration_password MIGRATION_PASSWORD
\getenv worker_password WORKER_PASSWORD
CREATE ROLE platform_migrator LOGIN PASSWORD :'migration_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE platform_app LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE platform_worker LOGIN PASSWORD :'worker_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE DATABASE platform OWNER platform_migrator;
\connect platform
REVOKE ALL ON DATABASE platform FROM PUBLIC;
GRANT CONNECT ON DATABASE platform TO platform_app, platform_worker;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER DATABASE platform SET timezone TO 'UTC';
SQL
unset PGPASSWORD APP_PASSWORD MIGRATION_PASSWORD WORKER_PASSWORD
