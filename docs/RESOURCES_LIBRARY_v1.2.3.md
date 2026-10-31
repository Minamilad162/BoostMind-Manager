# Resources Library — BoostMind OS v1.2.3

## Purpose and navigation

The **Resources** sidebar item opens a company-wide knowledge/file library independent of Projects and Saved Logins. Any active admin or developer can read the library. Only admins can edit.

### Workflow
1. Choose **Resources → New folder**. Enter a required folder title and optional description (up to 2,000 characters). Examples: `UI Components`, `UI/UX Files`, `Master Components`.
2. Open a folder, then click **Upload files**. Select one or multiple PDF, MD, TXT, DOC/DOCX, XLS/XLSX, PPT/PPTX, CSV, JSON, SQL, PNG, JPG, WEBP or ZIP files, up to 20 MB each.
3. Open a file via a short-lived signed URL, or download it. Files are not published by public URLs.
4. Search by folder title/description/file name. Admins can edit folder details or delete files. An admin can only delete an empty folder.

No project selector is needed: this is **not** the project-scoped Links & Saved Logins feature.

## Database migration

Run `supabase/migrations/202610280006_resources_library.sql` after the existing v1.2.2 migrations 001–005, first on a staging copy. Then run `supabase/VERIFY_v1.2.3_RESOURCES_READ_ONLY.sql`. This migration creates:
- `public.resource_folders` — folder name, description, author and timestamps, case-insensitive unique names.
- `public.resource_files` — folder relationship, original filename, private Storage path, bytes, MIME type, uploader and timestamp.
- Private Storage bucket `boostmind-resources` (20 MB object limit).
- RLS on both new tables **and** Storage objects; `authenticated` explicit grants only; anonymous access denied. Direct file paths cannot be made public.

### Access matrix

| Operation | Admin | Developer | Anonymous |
|---|---|---|---|
| Browse folders and files | Yes | Yes | No |
| Preview/download through 60-second signed URL | Yes | Yes | No |
| Add/edit/delete folders | Yes | No | No |
| Upload/delete files | Yes | No | No |

Authorization is enforced in Postgres policies based on a **currently active BoostMind profile**, not merely on hidden UI buttons. Store file bytes in Storage rather than Postgres. The browser's anon/public Supabase key is normal; never use service-role keys client-side. No new Edge Functions, secrets or dependency packages are required.

## Integrity / QA
- New file uploads occur first in private Storage, then insert a metadata row. On metadata failure the client attempts to remove the uploaded object. Investigate the Storage audit if cleanup also fails.
- For deletes, the client removes the Storage object first and the metadata second. If the second step fails, the UI reports the stale metadata so an admin can retry/reconcile.
- File extension and size are validated in the client and SQL/Storage rules; uploads still require normal content security precautions (no malware scanning is provided).
- Back up before migration. The upgrade makes no changes to historical invoices, project money, tasks, client links or credentials.
- `npm test` checks business logic, the new file-validation helper, UI integration and RLS source contracts. **Do not treat static tests as a live Supabase RLS test**: on staging sign in as an Admin, Developer, and anonymous user to validate actual file permissions.
- CI typecheck/build/audit must pass with a real npm install and lockfile, and a manual desktop/mobile smoke test must pass before a Production rollout.
