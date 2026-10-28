-- BoostMind OS v1.1.3: all custom links/logins belong to a project.
-- Apply AFTER migration 003, only once. Additive; keeps all existing records.
-- Existing credential_records.project_id already has FK -> projects(id) ON DELETE CASCADE.
BEGIN;

-- A custom resource may have a web link with or without a password.
ALTER TABLE public.credential_records ADD COLUMN IF NOT EXISTS access_url text;
ALTER TABLE public.credential_records DROP CONSTRAINT IF EXISTS credential_secret_text_required;
ALTER TABLE public.credential_records DROP CONSTRAINT IF EXISTS credential_resource_has_content;
ALTER TABLE public.credential_records ADD CONSTRAINT credential_resource_has_content
 CHECK ((secret_text IS NOT NULL AND length(secret_text) > 0)
  OR (access_url IS NOT NULL AND length(btrim(access_url)) > 0)
  OR (ciphertext IS NOT NULL AND iv IS NOT NULL));
ALTER TABLE public.credential_records DROP CONSTRAINT IF EXISTS credential_access_url_valid;
ALTER TABLE public.credential_records ADD CONSTRAINT credential_access_url_valid
 CHECK (access_url IS NULL OR
  (char_length(access_url) <= 2048 AND access_url ~* '^https?://[^[:space:]]+$'));

-- Direct browser grants remain narrow; active admins are enforced by RLS.
ALTER TABLE public.credential_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credential_records_admin_only ON public.credential_records;
CREATE POLICY credential_records_admin_only ON public.credential_records
 FOR ALL TO authenticated
 USING (private.is_admin()) WITH CHECK (private.is_admin());
REVOKE ALL ON TABLE public.credential_records FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, project_id, label, service, username, secret_text, access_url, created_at, updated_at)
 ON TABLE public.credential_records TO authenticated;
GRANT INSERT (project_id, label, service, username, secret_text, access_url)
 ON TABLE public.credential_records TO authenticated;
GRANT UPDATE (label, service, username, secret_text, access_url)
 ON TABLE public.credential_records TO authenticated;
GRANT DELETE ON TABLE public.credential_records TO authenticated;

CREATE INDEX IF NOT EXISTS credential_resources_project_created_idx
 ON public.credential_records(project_id,created_at DESC);
COMMENT ON COLUMN public.credential_records.access_url IS
 'Optional custom http(s) project link; can coexist with admin-only plaintext login.';
COMMIT;
