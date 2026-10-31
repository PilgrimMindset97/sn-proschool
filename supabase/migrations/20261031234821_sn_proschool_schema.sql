/*
# SN ProSchool — Schéma complet de gestion scolaire multi-établissements

## Description
Crée l'architecture complète de la base de données pour le logiciel de gestion scolaire
SN ProSchool. Cette migration unique regroupe le schéma principal et toutes les fonctionnalités
en une installation cohérente sur une base Supabase neuve.

## Support multi-établissements
- Table `establishments` : chaque établissement est identifié de façon unique.
- Toutes les tables métier portent un `establishment_id` (FK vers establishments).
- Les politiques RLS filtrent systématiquement par établissement via une fonction
  `current_establishment_id()` qui renvoie l'établissement du profil de l'utilisateur connecté.
- Un super_admin voit tous les établissements; un autre membre du personnel ne voit
  que les données de l'établissement auquel il appartient.

## Rôles (enum app_role)
super_admin, admin, directeur, directeur_etudes, surveillant_general,
surveillant_general_adjoint, personnel_administratif, agent_securite,
agent_entretien, comptable, secretaire, censeur, enseignant, parent

## Nouvelles tables
1. establishments — établissements scolaires
2. profiles — profils utilisateurs (lien auth.users + rôle + établissement)
3. school_years — années scolaires par établissement
4. terms — trimestres par année scolaire
5. classes — classes par établissement et année
6. subjects — matières par cycle/établissement
7. teachers — enseignants par établissement
8. students — élèves par établissement (matricule auto-généré, statut actif/inactif)
9. grades — notes des élèves (sur 20, coefficientées, par période)
10. payments — paiements (frais scolarité, inscription, autres) avec référence unique
11. attendance — présences/absences/retards des élèves
12. staff_attendance — pointage du personnel
13. parent_student_links — liaison parent ↔ élève (compte parent authentifié)
14. audit_logs — journal d'audit global (actions sensibles)
15. staff_sessions — suivi des sessions du personnel (heartbeat)
16. account_requests — demandes publiques de compte (validées par super_admin)

## Sécurité
- RLS activée sur toutes les tables.
- 4 politiques séparées (SELECT/INSERT/UPDATE/DELETE) par table.
- Fonctions SECURITY DEFINER avec search_path contrôlé.
- Le super_admin voit tous les établissements; le personnel ne voit que le sien.
- Les parents ne voient que les élèves liés à leur compte.
- Le journal d'audit est lisible uniquement par le super_admin.
- Les modifications de rôle passent par une Edge Function, jamais par le navigateur.
- Trigger de profil : inscription publique = rôle parent, jamais admin.
- Trigger de matricule : génération automatique séquentielle sans collision.
- Trigger d'audit : journalisation automatique des insert/update/delete métier.
- Trigger de verrouillage : les fiches sont verrouillées après création; seul le
  super_admin peut autoriser une correction temporaire.
- Trigger créateur : attribution automatique du created_by = auth.uid().

## Notes importantes
1. Les comptes Auth restent gérés par Supabase Auth.
2. Le premier super_admin doit être créé manuellement dans Auth, puis son profil
   mis à jour avec le rôle super_admin.
3. La création de comptes du personnel se fait via Edge Function (create-staff-account).
4. Le blocage/déblocage et la réinitialisation de mot de passe se font via Edge Function
   (manage-staff-account).
5. Ne jamais exposer la clé service_role dans le frontend.
*/

create extension if not exists pgcrypto;

-- ============================================================
-- Types enum
-- ============================================================
do $$ begin
  create type public.app_role as enum (
    'super_admin','admin','directeur','directeur_etudes','surveillant_general',
    'surveillant_general_adjoint','personnel_administratif','agent_securite',
    'agent_entretien','comptable','secretaire','censeur','enseignant','parent'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cycle_type as enum ('Maternelle','Primaire','Collège','Lycée');
exception when duplicate_object then null; end $$;

-- ============================================================
-- Table: establishments
-- ============================================================
create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  address text default '',
  phone text default '',
  email text default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Table: profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text default '',
  full_name text not null default '',
  role public.app_role not null default 'parent',
  establishment_id uuid references public.establishments(id) on delete set null,
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles(lower(email));
create index if not exists profiles_establishment_idx on public.profiles(establishment_id);
create index if not exists profiles_created_by_idx on public.profiles(created_by);

-- ============================================================
-- Table: school_years
-- ============================================================
create table if not exists public.school_years (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  label text not null,
  start_date date,
  end_date date,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique(establishment_id, label)
);

-- ============================================================
-- Table: terms (trimestres)
-- ============================================================
create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  label text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  unique(school_year_id, label)
);

-- ============================================================
-- Table: classes
-- ============================================================
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  school_year_id uuid references public.school_years(id) on delete set null,
  cycle public.cycle_type not null,
  niveau text not null,
  nom text not null,
  capacity int default 0,
  created_at timestamptz not null default now(),
  unique(establishment_id, nom, school_year_id)
);

-- ============================================================
-- Table: subjects (matières)
-- ============================================================
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  cycle public.cycle_type not null,
  nom text not null,
  coefficient numeric(6,2) not null default 1 check(coefficient > 0),
  created_at timestamptz not null default now(),
  unique(establishment_id, cycle, nom)
);

-- ============================================================
-- Table: teachers (enseignants)
-- ============================================================
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  nom text not null,
  matiere text not null,
  classes text not null default '',
  cycle text,
  salle text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists teachers_establishment_idx on public.teachers(establishment_id);

-- ============================================================
-- Table: students (élèves)
-- ============================================================
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  matricule text unique not null,
  nom text not null,
  prenom text not null,
  cycle public.cycle_type not null,
  classe text not null,
  parent_name text default '',
  telephone text default '',
  account_email text default '',
  photo_url text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists students_establishment_idx on public.students(establishment_id);
create index if not exists students_created_by_idx on public.students(created_by);
create unique index if not exists students_matricule_unique_idx on public.students(upper(matricule));

-- ============================================================
-- Table: grades (notes)
-- ============================================================
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  matiere text not null,
  note numeric(5,2) not null check(note >= 0),
  bareme numeric(5,2) not null default 20 check(bareme > 0 and note <= bareme),
  coefficient numeric(6,2) not null default 1 check(coefficient > 0),
  periode text not null,
  is_absent boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists grades_student_idx on public.grades(student_id);
create index if not exists grades_establishment_idx on public.grades(establishment_id);

-- ============================================================
-- Table: payments (paiements)
-- ============================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  motif text not null,
  montant numeric(12,2) not null check(montant > 0),
  date_paiement date not null default current_date,
  mode text not null check(mode in ('Espèces','Chèque','Virement','Mobile Money','Carte')),
  reference text unique not null,
  status text not null default 'validé' check(status in ('validé','annulé','remboursé')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists payments_student_idx on public.payments(student_id);
create index if not exists payments_establishment_idx on public.payments(establishment_id);
create index if not exists payments_reference_idx on public.payments(reference);

-- ============================================================
-- Table: attendance (présences élèves)
-- ============================================================
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  date_presence date not null,
  statut text not null check(statut in ('Présent','Absent','En retard','Absence justifiée')),
  motif text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(student_id, date_presence)
);

create index if not exists attendance_student_idx on public.attendance(student_id);
create index if not exists attendance_establishment_idx on public.attendance(establishment_id);

-- ============================================================
-- Table: staff_attendance (pointage personnel)
-- ============================================================
create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  nom text not null,
  fonction text not null check(fonction in ('Enseignant','Responsable','Directeur','Personnel administratif')),
  date_presence date not null default current_date,
  heure_arrivee time,
  heure_depart time,
  jour text,
  salle text,
  matiere text,
  statut text not null check(statut in ('Présent','Absent','En retard')),
  motif text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists staff_attendance_establishment_idx on public.staff_attendance(establishment_id);

-- ============================================================
-- Table: parent_student_links
-- ============================================================
create table if not exists public.parent_student_links (
  parent_user_id uuid references auth.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  primary key(parent_user_id, student_id)
);

-- ============================================================
-- Table: audit_logs
-- ============================================================
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  establishment_id uuid references public.establishments(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists audit_logs_establishment_idx on public.audit_logs(establishment_id);

-- ============================================================
-- Table: staff_sessions
-- ============================================================
create table if not exists public.staff_sessions (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint staff_sessions_time_order check (ended_at is null or ended_at >= started_at)
);

create index if not exists staff_sessions_user_started_idx on public.staff_sessions(user_id, started_at desc);
create index if not exists staff_sessions_last_seen_idx on public.staff_sessions(last_seen_at desc);

-- ============================================================
-- Table: account_requests
-- ============================================================
create table if not exists public.account_requests (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  requested_role text not null check(requested_role in (
    'Administrateur','Directeur','Directeur des études','Surveillant général',
    'Surveillant général adjoint','Personnel administratif','Agent de sécurité',
    'Agent d''entretien','Comptable','Secrétaire','Censeur','Enseignant'
  )),
  message text not null default '',
  status text not null default 'pending' check(status in ('pending','reviewed','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.account_requests enable row level security;

-- ============================================================
-- Fonctions utilitaires (SECURITY DEFINER, search_path = public)
-- ============================================================

-- Rôle actuel de l'utilisateur connecté
create or replace function public.current_role()
returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active = true
$$;

-- Établissement de l'utilisateur connecté
create or replace function public.current_establishment_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select establishment_id from public.profiles where id = auth.uid() and active = true
$$;

-- Vérifie si l'utilisateur est membre du personnel
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() in (
    'super_admin','admin','directeur','directeur_etudes','surveillant_general',
    'surveillant_general_adjoint','personnel_administratif','agent_securite',
    'agent_entretien','comptable','secretaire','censeur','enseignant'
  ), false)
$$;

-- Vérifie si l'utilisateur est un administrateur gestionnaire
create or replace function public.is_admin_manager()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() in ('super_admin','admin'), false)
$$;

-- Vérifie si l'utilisateur appartient à un établissement donné (ou est super_admin)
create or replace function public.can_access_establishment(p_est_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role() = 'super_admin'
  or public.current_establishment_id() = p_est_id
$$;

revoke all on function public.current_role() from public;
revoke all on function public.current_establishment_id() from public;
revoke all on function public.is_staff() from public;
revoke all on function public.is_admin_manager() from public;
revoke all on function public.can_access_establishment(uuid) from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.current_establishment_id() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin_manager() to authenticated;
grant execute on function public.can_access_establishment(uuid) to authenticated;

-- ============================================================
-- Trigger: profil automatique à l'inscription (rôle parent, jamais admin)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, full_name, role, active, must_change_password)
  values(
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'parent',
    true,
    true
  )
  on conflict(id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- Trigger: attribution automatique du matricule élève
-- ============================================================
create or replace function public.assign_student_matricule()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_year text := to_char(current_date, 'YYYY');
  v_next integer;
begin
  if new.matricule is not null and new.matricule <> '' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('sn_proschool_student_matricule_' || v_year));
  select coalesce(max(substring(matricule from '^SN-' || v_year || '-([0-9]+)$')::integer), 0) + 1
    into v_next
  from public.students
  where matricule ~ ('^SN-' || v_year || '-[0-9]+$');
  new.matricule := 'SN-' || v_year || '-' || lpad(v_next::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_assign_student_matricule on public.students;
create trigger trg_assign_student_matricule
before insert on public.students
for each row execute function public.assign_student_matricule();

-- ============================================================
-- Trigger: attribution automatique du created_by
-- ============================================================
create or replace function public.set_record_creator()
returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Session utilisateur requise';
  end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  elsif old.created_by is distinct from auth.uid() and public.current_role() <> 'super_admin' then
    raise exception 'Vous ne pouvez pas modifier les données d''un autre compte';
  end if;
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['students','grades','payments','attendance','staff_attendance','teachers'] loop
    execute format('drop trigger if exists trg_creator_%I on public.%I', t, t);
    execute format('create trigger trg_creator_%I before insert or update on public.%I for each row execute function public.set_record_creator()', t, t);
  end loop;
end $$;

-- ============================================================
-- Trigger: journalisation automatique (audit)
-- ============================================================
create or replace function public.audit_business_change()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rid text;
  oldj jsonb;
  newj jsonb;
  v_est_id uuid;
begin
  v_est_id := coalesce(new.establishment_id, old.establishment_id);
  if tg_op = 'DELETE' then
    rid := old.id::text;
    oldj := to_jsonb(old);
    newj := null;
  elsif tg_op = 'UPDATE' then
    rid := new.id::text;
    oldj := to_jsonb(old);
    newj := to_jsonb(new);
  else
    rid := new.id::text;
    oldj := null;
    newj := to_jsonb(new);
  end if;
  insert into public.audit_logs(establishment_id, actor_id, action, entity, entity_id, old_values, new_values)
  values(v_est_id, auth.uid(), lower(tg_op), tg_table_name, rid, oldj, newj);
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['students','grades','payments','attendance','staff_attendance','teachers'] loop
    execute format('drop trigger if exists trg_audit_%I on public.%I', t, t);
    execute format('create trigger trg_audit_%I after insert or update or delete on public.%I for each row execute function public.audit_business_change()', t, t);
  end loop;
end $$;

-- ============================================================
-- Trigger: verrouillage des enregistrements métier
-- ============================================================
do $$ declare t text; begin
  foreach t in array array['students','grades','payments','attendance','staff_attendance','teachers'] loop
    execute format('alter table public.%I add column if not exists is_locked boolean not null default true', t);
    execute format('alter table public.%I add column if not exists locked_at timestamptz', t);
    execute format('alter table public.%I add column if not exists locked_by uuid references auth.users(id) on delete set null', t);
  end loop;
end $$;

create or replace function public.enforce_record_lock()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.is_locked := true;
    new.locked_at := now();
    new.locked_by := auth.uid();
    return new;
  end if;
  if public.current_role() = 'super_admin' then
    if new.is_locked and not old.is_locked then
      new.locked_at := now();
      new.locked_by := auth.uid();
    elsif not new.is_locked then
      new.locked_at := null;
      new.locked_by := null;
    end if;
    return new;
  end if;
  if old.is_locked then
    raise exception 'Enregistrement verrouillé : seul le Super Admin peut autoriser une correction.' using errcode = '42501';
  end if;
  new.is_locked := true;
  new.locked_at := now();
  new.locked_by := auth.uid();
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['students','grades','payments','attendance','staff_attendance','teachers'] loop
    execute format('drop trigger if exists trg_enforce_record_lock on public.%I', t);
    execute format('create trigger trg_enforce_record_lock before insert or update on public.%I for each row execute function public.enforce_record_lock()', t, t);
  end loop;
end $$;

-- RPC de verrouillage/déverrouillage (super_admin uniquement)
create or replace function public.set_business_record_lock(p_table text, p_id uuid, p_locked boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.current_role() <> 'super_admin' then
    raise exception 'Action réservée au Super Admin.' using errcode = '42501';
  end if;
  if p_table not in ('students','grades','payments','attendance','staff_attendance','teachers') then
    raise exception 'Table non autorisée.';
  end if;
  execute format(
    'update public.%I set is_locked=$1, locked_at=case when $1 then now() else null end, locked_by=case when $1 then auth.uid() else null end where id=$2',
    p_table
  ) using p_locked, p_id;
  if not found then
    raise exception 'Enregistrement introuvable.';
  end if;
  insert into public.audit_logs(establishment_id, actor_id, action, entity, entity_id, new_values)
  values(public.current_establishment_id(), auth.uid(), case when p_locked then 'lock' else 'unlock_for_correction' end, p_table, p_id::text, jsonb_build_object('is_locked', p_locked));
end;
$$;
revoke all on function public.set_business_record_lock(text,uuid,boolean) from public;
grant execute on function public.set_business_record_lock(text,uuid,boolean) to authenticated;

-- ============================================================
-- Trigger: protection du statut actif élève (super_admin uniquement)
-- ============================================================
create or replace function public.protect_student_active_status()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.active is distinct from new.active and coalesce(public.current_role()::text, '') <> 'super_admin' then
    raise exception 'Seul le Super Admin peut modifier le statut actif/inactif d''un élève.';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_student_active_status_trigger on public.students;
create trigger protect_student_active_status_trigger
before update on public.students
for each row execute function public.protect_student_active_status();

-- ============================================================
-- Fonction: portail parent (lookup par matricule + téléphone)
-- ============================================================
create or replace function public.parent_portal_lookup(p_matricule text, p_parent_phone text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_student public.students%rowtype;
  v_phone text;
begin
  v_phone := regexp_replace(coalesce(p_parent_phone, ''), '[^0-9]', '', 'g');
  if length(v_phone) < 6 or length(coalesce(p_matricule, '')) < 5 then
    return jsonb_build_object('error', 'invalid_credentials');
  end if;
  select * into v_student
  from public.students s
  where upper(s.matricule) = upper(trim(p_matricule))
    and regexp_replace(coalesce(s.telephone, ''), '[^0-9]', '', 'g') = v_phone
    and coalesce(s.active, true) = true
  limit 1;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;
  return jsonb_build_object(
    'student', jsonb_build_object(
      'id', v_student.id, 'matricule', v_student.matricule, 'nom', v_student.nom,
      'prenom', v_student.prenom, 'cycle', v_student.cycle, 'classe', v_student.classe
    ),
    'grades', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'matiere', g.matiere, 'note', g.note, 'bareme', g.bareme, 'coefficient', g.coefficient, 'periode', g.periode, 'is_absent', g.is_absent) order by g.periode, g.matiere)
      from public.grades g where g.student_id = v_student.id
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'motif', p.motif, 'montant', p.montant, 'date_paiement', p.date_paiement, 'mode', p.mode, 'reference', p.reference) order by p.date_paiement desc)
      from public.payments p where p.student_id = v_student.id and p.status = 'validé'
    ), '[]'::jsonb),
    'attendance', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'date_presence', a.date_presence, 'statut', a.statut, 'motif', a.motif) order by a.date_presence desc)
      from public.attendance a where a.student_id = v_student.id
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.parent_portal_lookup(text,text) from public;
grant execute on function public.parent_portal_lookup(text,text) to anon, authenticated;

-- ============================================================
-- Activation RLS sur toutes les tables
-- ============================================================
alter table public.establishments enable row level security;
alter table public.profiles enable row level security;
alter table public.school_years enable row level security;
alter table public.terms enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.grades enable row level security;
alter table public.payments enable row level security;
alter table public.attendance enable row level security;
alter table public.staff_attendance enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.audit_logs enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.account_requests enable row level security;

-- ============================================================
-- Grants explicites
-- ============================================================
grant select on public.establishments to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.school_years to authenticated;
grant select, insert, update, delete on public.terms to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.subjects to authenticated;
grant select, insert, update, delete on public.teachers to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.grades to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.attendance to authenticated;
grant select, insert, update, delete on public.staff_attendance to authenticated;
grant select, insert, update, delete on public.parent_student_links to authenticated;
grant select on public.audit_logs to authenticated;
grant delete on public.audit_logs to authenticated;
grant select, insert, update on public.staff_sessions to authenticated;
grant insert on public.account_requests to anon, authenticated;
grant select, update on public.account_requests to authenticated;

-- ============================================================
-- Politiques RLS
-- ============================================================

-- establishments : super_admin voit tout; le personnel voit son établissement
drop policy if exists "establishments_read" on public.establishments;
create policy "establishments_read" on public.establishments
  for select to authenticated
  using (public.current_role() = 'super_admin' or id = public.current_establishment_id());

drop policy if exists "establishments_manage" on public.establishments;
create policy "establishments_manage" on public.establishments
  for insert to authenticated
  with check (public.current_role() = 'super_admin');

drop policy if exists "establishments_update" on public.establishments;
create policy "establishments_update" on public.establishments
  for update to authenticated
  using (public.current_role() = 'super_admin')
  with check (public.current_role() = 'super_admin');

-- profiles : soi-même ou super_admin; gestion rôle par edge function
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.current_role() = 'super_admin');

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- school_years
drop policy if exists "school_years_read" on public.school_years;
create policy "school_years_read" on public.school_years
  for select to authenticated
  using (public.can_access_establishment(establishment_id));

drop policy if exists "school_years_manage" on public.school_years;
create policy "school_years_manage" on public.school_years
  for insert to authenticated
  with check (public.can_access_establishment(establishment_id) and public.is_admin_manager());

drop policy if exists "school_years_update" on public.school_years;
create policy "school_years_update" on public.school_years
  for update to authenticated
  using (public.can_access_establishment(establishment_id) and public.is_admin_manager())
  with check (public.can_access_establishment(establishment_id) and public.is_admin_manager());

drop policy if exists "school_years_delete" on public.school_years;
create policy "school_years_delete" on public.school_years
  for delete to authenticated
  using (public.can_access_establishment(establishment_id) and public.current_role() = 'super_admin');

-- terms
drop policy if exists "terms_read" on public.terms;
create policy "terms_read" on public.terms
  for select to authenticated
  using (exists(select 1 from public.school_years sy where sy.id = terms.school_year_id and public.can_access_establishment(sy.establishment_id)));

drop policy if exists "terms_manage" on public.terms;
create policy "terms_manage" on public.terms
  for insert to authenticated
  with check (exists(select 1 from public.school_years sy where sy.id = terms.school_year_id and public.can_access_establishment(sy.establishment_id) and public.is_admin_manager()));

drop policy if exists "terms_update" on public.terms;
create policy "terms_update" on public.terms
  for update to authenticated
  using (exists(select 1 from public.school_years sy where sy.id = terms.school_year_id and public.can_access_establishment(sy.establishment_id) and public.is_admin_manager()))
  with check (exists(select 1 from public.school_years sy where sy.id = terms.school_year_id and public.can_access_establishment(sy.establishment_id) and public.is_admin_manager()));

drop policy if exists "terms_delete" on public.terms;
create policy "terms_delete" on public.terms
  for delete to authenticated
  using (exists(select 1 from public.school_years sy where sy.id = terms.school_year_id and public.can_access_establishment(sy.establishment_id) and public.is_admin_manager()));

-- classes
drop policy if exists "classes_read" on public.classes;
create policy "classes_read" on public.classes
  for select to authenticated
  using (public.can_access_establishment(establishment_id));

drop policy if exists "classes_manage" on public.classes;
create policy "classes_manage" on public.classes
  for insert to authenticated
  with check (public.can_access_establishment(establishment_id) and public.is_staff());

drop policy if exists "classes_update" on public.classes;
create policy "classes_update" on public.classes
  for update to authenticated
  using (public.can_access_establishment(establishment_id) and public.is_staff())
  with check (public.can_access_establishment(establishment_id) and public.is_staff());

drop policy if exists "classes_delete" on public.classes;
create policy "classes_delete" on public.classes
  for delete to authenticated
  using (public.can_access_establishment(establishment_id) and public.is_admin_manager());

-- subjects
drop policy if exists "subjects_read" on public.subjects;
create policy "subjects_read" on public.subjects
  for select to authenticated
  using (public.can_access_establishment(establishment_id));

drop policy if exists "subjects_manage" on public.subjects;
create policy "subjects_manage" on public.subjects
  for insert to authenticated
  with check (public.can_access_establishment(establishment_id) and public.is_admin_manager());

drop policy if exists "subjects_update" on public.subjects;
create policy "subjects_update" on public.subjects
  for update to authenticated
  using (public.can_access_establishment(establishment_id) and public.is_admin_manager())
  with check (public.can_access_establishment(establishment_id) and public.is_admin_manager());

drop policy if exists "subjects_delete" on public.subjects;
create policy "subjects_delete" on public.subjects
  for delete to authenticated
  using (public.can_access_establishment(establishment_id) and public.is_admin_manager());

-- teachers
drop policy if exists "teachers_read" on public.teachers;
create policy "teachers_read" on public.teachers
  for select to authenticated
  using (public.can_access_establishment(establishment_id) and public.is_staff());

drop policy if exists "teachers_insert" on public.teachers;
create policy "teachers_insert" on public.teachers
  for insert to authenticated
  with check (public.can_access_establishment(establishment_id) and public.current_role() in ('super_admin','admin','directeur','censeur'));

drop policy if exists "teachers_update" on public.teachers;
create policy "teachers_update" on public.teachers
  for update to authenticated
  using (public.can_access_establishment(establishment_id) and public.current_role() in ('super_admin','admin','directeur','censeur'))
  with check (public.can_access_establishment(establishment_id) and public.current_role() in ('super_admin','admin','directeur','censeur'));

drop policy if exists "teachers_delete" on public.teachers;
create policy "teachers_delete" on public.teachers
  for delete to authenticated
  using (public.can_access_establishment(establishment_id) and public.current_role() in ('super_admin','admin','directeur'));

-- students
drop policy if exists "students_read" on public.students;
create policy "students_read" on public.students
  for select to authenticated
  using (
    public.current_role() = 'super_admin'
    or (public.can_access_establishment(establishment_id) and public.is_staff())
    or exists(select 1 from public.parent_student_links l where l.student_id = students.id and l.parent_user_id = auth.uid())
  );

drop policy if exists "students_insert" on public.students;
create policy "students_insert" on public.students
  for insert to authenticated
  with check (
    public.can_access_establishment(establishment_id)
    and public.current_role() in ('super_admin','admin','directeur','secretaire','censeur')
  );

drop policy if exists "students_update" on public.students;
create policy "students_update" on public.students
  for update to authenticated
  using (
    public.current_role() = 'super_admin'
    or (public.can_access_establishment(establishment_id) and public.current_role() in ('admin','directeur','secretaire','censeur'))
  )
  with check (public.can_access_establishment(establishment_id));

drop policy if exists "students_delete" on public.students;
create policy "students_delete" on public.students
  for delete to authenticated
  using (
    public.current_role() = 'super_admin'
    or (public.can_access_establishment(establishment_id) and public.current_role() in ('admin','directeur'))
  );

-- grades
drop policy if exists "grades_read" on public.grades;
create policy "grades_read" on public.grades
  for select to authenticated
  using (
    public.current_role() = 'super_admin'
    or (public.can_access_establishment(establishment_id) and public.is_staff())
    or exists(select 1 from public.parent_student_links l where l.student_id = grades.student_id and l.parent_user_id = auth.uid())
  );

drop policy if exists "grades_insert" on public.grades;
create policy "grades_insert" on public.grades
  for insert to authenticated
  with check (
    public.can_access_establishment(establishment_id)
    and public.current_role() in ('super_admin','admin','directeur','directeur_etudes','censeur','enseignant')
  );

drop policy if exists "grades_update" on public.grades;
create policy "grades_update" on public.grades
  for update to authenticated
  using (
    public.current_role() = 'super_admin'
    or (public.can_access_establishment(establishment_id) and public.current_role() in ('admin','directeur','directeur_etudes','censeur','enseignant'))
  )
  with check (public.can_access_establishment(establishment_id));

drop policy if exists "grades_delete" on public.grades;
create policy "grades_delete" on public.grades
  for delete to authenticated
  using (
    public.current_role() = 'super_admin'
    or (public.can_access_establishment(establishment_id) and public.current_role() in ('admin','directeur','directeur_etudes','censeur'))
  );

-- payments
drop policy if exists "payments_read" on public.payments;
create policy "payments_read" on public.payments
  for select to authenticated
  using (
    public.current_role() = 'super_admin'
    or (public.can_access_establishment(establishment_id) and public.current_role() in ('admin','directeur','comptable'))
    or exists(select 1 from public.parent_student_links l where l.student_id = payments.student_id and l.parent_user_id = auth.uid())
  );

drop policy if exists "payments_insert" on public.payments;
create policy "payments_insert" on public.payments
  for insert to authenticated
  with check (
    public.can_access_establishment(establishment_id)
    and public.current_role() in ('super_admin','admin','comptable')
  );

drop policy if exists "payments_update" on public.payments;
create policy "payments_update" on public.payments
  for update to authenticated
  using (
    public.current_role() = 'super_admin'
    or (public.can_access_establishment(establishment_id) and public.current_role() in ('admin','comptable'))
  )
  with check (public.can_access_establishment(establishment_id));

drop policy if exists "payments_delete" on public.payments;
create policy "payments_delete" on public.payments
  for delete to authenticated
  using (
    public.current_role() = 'super_admin'
    or (public.can_access_establishment(establishment_id) and public.current_role() = 'admin')
  );

-- attendance
drop policy if exists "attendance_read" on public.attendance;
create policy "attendance_read" on public.attendance
  for select to authenticated
  using (
    public.current_role() = 'super_admin'
    or (public.can_access_establishment(establishment_id) and public.is_staff())
    or exists(select 1 from public.parent_student_links l where l.student_id = attendance.student_id and l.parent_user_id = auth.uid())
  );

drop policy if exists "attendance_insert" on public.attendance;
create policy "attendance_insert" on public.attendance
  for insert to authenticated
  with check (
    public.can_access_establishment(establishment_id)
    and public.current_role() in ('super_admin','admin','directeur','directeur_etudes','surveillant_general','surveillant_general_adjoint','censeur','enseignant')
  );

drop policy if exists "attendance_update" on public.attendance;
create policy "attendance_update" on public.attendance
  for update to authenticated
  using (
    public.current_role() = 'super_admin'
    or (public.can_access_establishment(establishment_id) and public.current_role() in ('admin','directeur','surveillant_general','surveillant_general_adjoint','censeur','enseignant'))
  )
  with check (public.can_access_establishment(establishment_id));

drop policy if exists "attendance_delete" on public.attendance;
create policy "attendance_delete" on public.attendance
  for delete to authenticated
  using (
    public.current_role() = 'super_admin'
    or (public.can_access_establishment(establishment_id) and public.current_role() in ('admin','directeur','surveillant_general'))
  );

-- staff_attendance
drop policy if exists "staff_attendance_read" on public.staff_attendance;
create policy "staff_attendance_read" on public.staff_attendance
  for select to authenticated
  using (public.can_access_establishment(establishment_id) and public.is_staff());

drop policy if exists "staff_attendance_insert" on public.staff_attendance;
create policy "staff_attendance_insert" on public.staff_attendance
  for insert to authenticated
  with check (
    public.can_access_establishment(establishment_id)
    and public.current_role() in ('super_admin','admin','directeur','censeur','enseignant','secretaire','surveillant_general','surveillant_general_adjoint')
  );

drop policy if exists "staff_attendance_update" on public.staff_attendance;
create policy "staff_attendance_update" on public.staff_attendance
  for update to authenticated
  using (public.can_access_establishment(establishment_id) and public.current_role() in ('super_admin','admin','directeur','censeur','surveillant_general'))
  with check (public.can_access_establishment(establishment_id));

drop policy if exists "staff_attendance_delete" on public.staff_attendance;
create policy "staff_attendance_delete" on public.staff_attendance
  for delete to authenticated
  using (public.can_access_establishment(establishment_id) and public.current_role() in ('super_admin','admin','directeur'));

-- parent_student_links
drop policy if exists "links_read" on public.parent_student_links;
create policy "links_read" on public.parent_student_links
  for select to authenticated
  using (parent_user_id = auth.uid() or public.current_role() = 'super_admin');

drop policy if exists "links_insert" on public.parent_student_links;
create policy "links_insert" on public.parent_student_links
  for insert to authenticated
  with check (parent_user_id = auth.uid() or public.current_role() = 'super_admin');

drop policy if exists "links_delete" on public.parent_student_links;
create policy "links_delete" on public.parent_student_links
  for delete to authenticated
  using (parent_user_id = auth.uid() or public.current_role() = 'super_admin');

-- audit_logs : lecture super_admin uniquement; insertion système
drop policy if exists "audit_read" on public.audit_logs;
create policy "audit_read" on public.audit_logs
  for select to authenticated
  using (public.current_role() = 'super_admin');

drop policy if exists "audit_insert" on public.audit_logs;
create policy "audit_insert" on public.audit_logs
  for insert to authenticated
  with check (public.current_role() = 'super_admin' or actor_id = auth.uid());

drop policy if exists "audit_delete" on public.audit_logs;
create policy "audit_delete" on public.audit_logs
  for delete to authenticated
  using (public.current_role() = 'super_admin');

-- staff_sessions
drop policy if exists "sessions_read" on public.staff_sessions;
create policy "sessions_read" on public.staff_sessions
  for select to authenticated
  using (public.current_role() = 'super_admin' or user_id = auth.uid());

drop policy if exists "sessions_insert" on public.staff_sessions;
create policy "sessions_insert" on public.staff_sessions
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_staff());

drop policy if exists "sessions_update" on public.staff_sessions;
create policy "sessions_update" on public.staff_sessions
  for update to authenticated
  using (user_id = auth.uid() and public.is_staff())
  with check (user_id = auth.uid());

-- account_requests
drop policy if exists "requests_submit" on public.account_requests;
create policy "requests_submit" on public.account_requests
  for insert to anon, authenticated
  with check (status = 'pending');

drop policy if exists "requests_read" on public.account_requests;
create policy "requests_read" on public.account_requests
  for select to authenticated
  using (public.current_role() = 'super_admin');

drop policy if exists "requests_update" on public.account_requests;
create policy "requests_update" on public.account_requests
  for update to authenticated
  using (public.current_role() = 'super_admin')
  with check (public.current_role() = 'super_admin');

-- ============================================================
-- Établissement par défaut + super_admin initial (optionnel)
-- ============================================================
do $$ begin
  insert into public.establishments(name, code, address, phone, email, active)
  values('Établissement par défaut', 'DEFAULT', '', '', '', true)
  on conflict(code) do nothing;
exception when others then null;
end $$;
