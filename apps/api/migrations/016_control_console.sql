-- Independent SaaS operator identities; never tenant membership roles.
CREATE ROLE gd_control NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO gd_control;
CREATE TABLE control_admins (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text NOT NULL UNIQUE,
 display_name text NOT NULL, password_hash text NOT NULL, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE control_sessions (
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64), csrf_token text NOT NULL,
 admin_id uuid NOT NULL REFERENCES control_admins(id), expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX control_sessions_expiry ON control_sessions(expires_at);
CREATE TABLE control_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), admin_id uuid NOT NULL REFERENCES control_admins(id),
 actor_name text NOT NULL, action text NOT NULL, tenant_id uuid REFERENCES tenants(id),
 target_user_id uuid REFERENCES users(id), before_data jsonb, after_data jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX control_audit_created ON control_audit(created_at DESC,id);
CREATE TABLE control_provision_requests (
 admin_id uuid NOT NULL REFERENCES control_admins(id), request_key text NOT NULL,
 request_data jsonb NOT NULL, tenant_id uuid NOT NULL REFERENCES tenants(id),
 user_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(admin_id,request_key)
);
ALTER TABLE tenants ADD COLUMN control_version integer NOT NULL DEFAULT 1 CHECK(control_version>0);
ALTER TABLE memberships ADD COLUMN control_version integer NOT NULL DEFAULT 1 CHECK(control_version>0);
GRANT SELECT ON control_admins TO gd_control;
GRANT SELECT,INSERT,DELETE ON control_sessions TO gd_control;
GRANT SELECT,INSERT ON control_audit,control_provision_requests TO gd_control;
GRANT SELECT(id,slug,name,active,created_at,control_version),INSERT ON tenants TO gd_control;
GRANT UPDATE(name,active,control_version) ON tenants TO gd_control;
GRANT SELECT(id,username,display_name,active),INSERT ON users TO gd_control;
GRANT UPDATE(password_hash) ON users TO gd_control;
GRANT SELECT,INSERT ON memberships TO gd_control;
GRANT UPDATE(active,control_version) ON memberships TO gd_control;
CREATE POLICY memberships_control ON memberships TO gd_control USING(true) WITH CHECK(true);
GRANT DELETE ON sessions TO gd_control;
GRANT SELECT(user_id,tenant_id) ON sessions TO gd_control;
REVOKE ALL ON control_admins,control_sessions,control_audit,control_provision_requests FROM PUBLIC,gd_auth,gd_tenant,gd_platform,gd_directory;
