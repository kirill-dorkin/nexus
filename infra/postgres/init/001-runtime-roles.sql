-- Local-development bootstrap only.
-- Production credentials are provisioned by infrastructure/secrets management,
-- never by this file.

CREATE ROLE platform_migrator
  LOGIN PASSWORD 'platform_migrator'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

CREATE ROLE platform_app
  LOGIN PASSWORD 'platform_app'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

CREATE ROLE platform_worker
  LOGIN PASSWORD 'platform_worker'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

CREATE DATABASE platform OWNER platform_migrator;

\connect platform

REVOKE ALL ON DATABASE platform FROM PUBLIC;
GRANT CONNECT ON DATABASE platform TO platform_app, platform_worker;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER DATABASE platform SET timezone TO 'UTC';
