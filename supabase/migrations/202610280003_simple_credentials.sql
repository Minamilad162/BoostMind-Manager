-- BoostMind OS v1.1.2: simple admin-only credential strings (NO Vault Edge Function).
-- Apply only AFTER 202610280001_initial.sql and 202610280002_dual_currency_reporting.sql.
-- No existing credential rows are deleted. Existing encrypted entries remain stored but
-- cannot be shown as text by this simplified UI; re-enter those credentials if needed.
-- WARNING: secret_text is readable PLAINTEXT to authorized admins via PostgREST.
BEGIN;
ALTER TABLE public.credential_records
 ADD COLUMN IF NOT EXISTS secret_text text;
ALTER TABLE public.credential_records
 ALTER COLUMN ciphertext DROP NOT NULL,
 ALTER COLUMN iv DROP NOT NULL;

-- Validate newly entered passwords; do not log or copy password text to audit records.
ALTER TABLE public.credential_records
 ADD CONSTRAINT credential_secret_text_length
 CHECK (secret_text IS NULL OR char_length(secret_text) BETWEEN 1 AND 4000);
ALTER TABLE public.credential_records
 ADD CONSTRAINT credential_secret_text_required
 CHECK (secret_text IS NOT NULL OR (ciphertext IS NOT NULL AND iv IS NOT NULL));

-- RLS only permits active admin profiles, including direct REST/API calls.
ALTER TABLE public.credential_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credential_records_admin_only ON public.credential_records;
CREATE POLICY credential_records_admin_only ON public.credential_records
 FOR ALL TO authenticated
 USING (private.is_admin()) WITH CHECK (private.is_admin());

-- Force narrow column permissions. Browsers never receive old ciphertext/IV columns.
REVOKE ALL ON TABLE public.credential_records FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, project_id, label, service, username, secret_text, created_at, updated_at)
 ON TABLE public.credential_records TO authenticated;
GRANT INSERT (project_id, label, service, username, secret_text)
 ON TABLE public.credential_records TO authenticated;
GRANT UPDATE (label, service, username, secret_text)
 ON TABLE public.credential_records TO authenticated;
GRANT DELETE ON TABLE public.credential_records TO authenticated;

-- Audit creates, edits and deletes without ever persisting credentials in the audit log.
CREATE OR REPLACE FUNCTION private.audit_credential_change() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_project uuid;
BEGIN
 IF TG_OP='DELETE' THEN v_id:=OLD.id; v_project:=OLD.project_id;
 ELSE v_id:=NEW.id; v_project:=NEW.project_id; END IF;
 INSERT INTO public.audit_events(actor_id,action,entity_type,entity_id,details)
 VALUES ((SELECT auth.uid()), 'credential.' || lower(TG_OP), 'credential', v_id,
         jsonb_build_object('project_id', v_project));
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS credential_change_audit ON public.credential_records;
CREATE TRIGGER credential_change_audit
 AFTER INSERT OR UPDATE OR DELETE ON public.credential_records
 FOR EACH ROW EXECUTE FUNCTION private.audit_credential_change();

COMMENT ON COLUMN public.credential_records.secret_text IS
 'PLAIN TEXT: explicitly requested simple storage. Admin RLS only; not application-encrypted.';
COMMIT;
