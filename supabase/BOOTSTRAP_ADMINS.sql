-- Run once manually in the NEW Supabase project's SQL editor, AFTER inviting both founders
-- and after both accounts exist in auth.users. Replace the email placeholders with real emails.
-- Never run this against an existing or unrelated Supabase project.
-- Always verify both matches before COMMIT.
begin;
-- SELECT id,email FROM auth.users WHERE email IN ('MINA_EMAIL','BISHOY_EMAIL');
update public.profiles set role='admin', name='Mina' where email=lower('MINA_EMAIL');
update public.profiles set role='admin', name='Bishoy' where email=lower('BISHOY_EMAIL');
-- SELECT email,role,name FROM public.profiles WHERE email IN ('MINA_EMAIL','BISHOY_EMAIL');
-- COMMIT after verifying; otherwise ROLLBACK.
rollback;
