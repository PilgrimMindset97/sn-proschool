# Project memory

## Product intent & audience

- School management software (gestion scolaire) with modules: tableau de bord, élèves, notes, présences, finances, personnel, enseignants, établissements, journal d'audit
- Multi-establishment support with a default establishment
- Role-based access with super_admin as top-level privileged user

## Brand personality & voice

- French-language UI and user-facing communication
- Direct, helpful, technical tone; concise explanations in assistant responses

## Visual design & UX direction

- Login screen with email + password fields as entry point
- Auth flow gates access to all modules
- App is a SPA (Vite + React) with module-based navigation after login

## Decisions, constraints & rationale

- **Backend:** Supabase (auth + database + RLS)
- **Env vars:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` required; Bolt dev server injects them at runtime, not available in shell; `.env` file needed for local dev outside Bolt
- **Auth:** Supabase Auth with email/password; profiles table linked to auth.users; trigger creates profile on signup
- **RLS:** Enabled and configured; profiles table has RLS policies
- **Super admin account (seeded):**
  - Email: norielsayet008@gmail.com
  - Password: 12345
  - Role: super_admin (active)
  - Establishment: Établissement par défaut
  - Password change required: no
- **Profile schema:** includes role, establishment_id, active status, password-change flag
- Framework: vite-react

## Open questions & assumptions

- Whether `.env` file was actually created or still needs to be added for non-Bolt local dev
- Exact schema details for profiles table and other tables (not yet captured)
- Whether additional roles exist beyond super_admin and their permission mappings
- Supabase project URL and anon key values (not visible/retrieved, runtime-injected only)
- UI component library or styling approach (not yet inferred)
- Whether the app has route protection / guards beyond the login screen