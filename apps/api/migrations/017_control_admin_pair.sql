-- Exactly two provisioned operators. New installations are empty until setup.
DO $$ BEGIN
 IF (SELECT count(*) FROM control_admins)>2 THEN
   RAISE EXCEPTION 'More than two platform operators already exist; resolve explicitly before migration';
 END IF;
END $$;
ALTER TABLE control_admins ADD COLUMN slot smallint;
WITH ranked AS (SELECT id,row_number() OVER(ORDER BY created_at,id) AS n FROM control_admins)
UPDATE control_admins a SET slot=r.n FROM ranked r WHERE r.id=a.id;
ALTER TABLE control_admins ALTER COLUMN slot SET NOT NULL;
ALTER TABLE control_admins ADD CONSTRAINT control_admins_slot_check CHECK(slot IN(1,2));
ALTER TABLE control_admins ADD CONSTRAINT control_admins_slot_unique UNIQUE(slot);
CREATE FUNCTION require_control_admin_pair() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (SELECT count(*) FROM control_admins)<>2 THEN
   RAISE EXCEPTION 'Platform operators must be provisioned and retained as exactly two accounts';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER control_admin_pair AFTER INSERT OR DELETE OR UPDATE ON control_admins
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_control_admin_pair();
CREATE FUNCTION prevent_control_admin_truncate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'The two platform operator accounts cannot be truncated'; END $$;
CREATE TRIGGER control_admin_no_truncate BEFORE TRUNCATE ON control_admins
 FOR EACH STATEMENT EXECUTE FUNCTION prevent_control_admin_truncate();
