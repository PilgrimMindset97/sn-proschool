-- SN PROSCHOOL : INSTALLATION CENTRALISEE - BASE UNIQUE SUPABASE / POSTGRESQL
-- Ce fichier regroupe le schema principal et les migrations du projet dans une seule base Supabase.
-- A utiliser sur un projet Supabase NEUF. Sur une base deja en production, faire une sauvegarde
-- et appliquer les migrations manquantes une par une apres verification; ne pas reinitialiser la base.
-- Les comptes Auth (auth.users) restent geres par Supabase Auth.

-- ETAPE 1 : schema principal
-- SN Proschool Gestion Scolaire — schéma de départ Supabase
-- Exécuter dans Supabase SQL Editor sur un projet neuf. Vérifier les politiques avant les données réelles.
create extension if not exists pgcrypto;
create type public.app_role as enum ('super_admin','admin','directeur','directeur_etudes','surveillant_general','surveillant_general_adjoint','personnel_administratif','agent_securite','agent_entretien','comptable','secretaire','censeur','enseignant','parent');
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 role public.app_role not null default 'parent',
 active boolean not null default true,
 must_change_password boolean not null default true,
 created_at timestamptz not null default now()
);
create or replace function public.current_role() returns public.app_role language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() and active=true $$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.current_role() in ('super_admin','admin','directeur','directeur_etudes','surveillant_general','surveillant_general_adjoint','personnel_administratif','agent_securite','agent_entretien','comptable','secretaire','censeur','enseignant'),false) $$;
create or replace function public.is_admin_manager() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.current_role() in ('super_admin','admin'),false) $$;
create table if not exists public.school_years(id uuid primary key default gen_random_uuid(),label text unique not null,start_date date,end_date date,active boolean not null default false,created_at timestamptz not null default now());
create table if not exists public.classes(id uuid primary key default gen_random_uuid(),cycle text not null check(cycle in ('Maternelle','Primaire','Collège','Lycée')),niveau text not null,nom text not null,school_year_id uuid references public.school_years(id),created_at timestamptz not null default now(),unique(nom,school_year_id));
create table if not exists public.students(id uuid primary key default gen_random_uuid(),matricule text unique not null,nom text not null,prenom text not null,cycle text not null check(cycle in ('Maternelle','Primaire','Collège','Lycée')),classe text not null,parent text,telephone text,created_at timestamptz not null default now(),created_by uuid references auth.users(id));
create table if not exists public.grades(id uuid primary key default gen_random_uuid(),student_id uuid not null references public.students(id),matiere text not null,note numeric(5,2) not null check(note>=0),bareme numeric(5,2) not null check(bareme>0 and note<=bareme),coefficient numeric(6,2) not null default 1 check(coefficient>0),periode text not null,created_by uuid references auth.users(id),created_at timestamptz not null default now());
create table if not exists public.payments(id uuid primary key default gen_random_uuid(),student_id uuid not null references public.students(id),motif text not null,montant numeric(12,2) not null check(montant>0),date_paiement date not null default current_date,mode text not null,reference text unique not null,status text not null default 'validé' check(status in ('validé','annulé','remboursé')),created_by uuid references auth.users(id),created_at timestamptz not null default now());
create table if not exists public.attendance(id uuid primary key default gen_random_uuid(),student_id uuid not null references public.students(id),date_presence date not null,statut text not null check(statut in ('Présent','Absent','En retard','Absence justifiée')),motif text,created_by uuid references auth.users(id),created_at timestamptz not null default now(),unique(student_id,date_presence));
create table if not exists public.audit_logs(id bigint generated always as identity primary key,actor_id uuid references auth.users(id),action text not null,entity text not null,entity_id text,old_values jsonb,new_values jsonb,reason text,created_at timestamptz not null default now());
create table if not exists public.parent_student_links(parent_user_id uuid references auth.users(id) on delete cascade,student_id uuid references public.students(id) on delete cascade,primary key(parent_user_id,student_id));
-- Trigger de profil : un utilisateur inscrit publiquement ne peut jamais devenir admin.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,full_name,role,active,must_change_password) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''), 'parent', true, true) on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
-- RLS
alter table public.profiles enable row level security;
alter table public.school_years enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.grades enable row level security;
alter table public.payments enable row level security;
alter table public.attendance enable row level security;
alter table public.audit_logs enable row level security;
alter table public.parent_student_links enable row level security;
-- Profiles : utilisateur voit son profil; le super admin peut lire les profils. Les changements de rôle doivent passer par une Edge Function contrôlée.
create policy "profile self read" on public.profiles for select to authenticated using (id=auth.uid() or public.current_role()='super_admin');
create policy "profile self update limited" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid() and role=public.current_role());
create policy "staff read school years" on public.school_years for select to authenticated using (public.is_staff());
create policy "admins manage school years" on public.school_years for all to authenticated using (public.is_admin_manager()) with check (public.is_admin_manager());
create policy "staff manage classes" on public.classes for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff read students" on public.students for select to authenticated using (public.is_staff() or exists(select 1 from public.parent_student_links l where l.student_id=id and l.parent_user_id=auth.uid()));
create policy "authorized staff manage students" on public.students for all to authenticated using (public.current_role() in ('super_admin','admin','directeur','secretaire','censeur')) with check (public.current_role() in ('super_admin','admin','directeur','secretaire','censeur'));
create policy "staff read grades" on public.grades for select to authenticated using (public.is_staff() or exists(select 1 from public.parent_student_links l where l.student_id=grades.student_id and l.parent_user_id=auth.uid()));
create policy "staff manage grades" on public.grades for insert to authenticated with check (public.current_role() in ('super_admin','admin','directeur','censeur','enseignant'));
create policy "authorized edit grades" on public.grades for update to authenticated using (public.current_role() in ('super_admin','admin','directeur','censeur','enseignant')) with check (public.current_role() in ('super_admin','admin','directeur','censeur','enseignant'));
create policy "accounting read payments" on public.payments for select to authenticated using (public.current_role() in ('super_admin','admin','directeur','directeur_etudes','surveillant_general','surveillant_general_adjoint','personnel_administratif','agent_securite','agent_entretien','comptable') or exists(select 1 from public.parent_student_links l where l.student_id=payments.student_id and l.parent_user_id=auth.uid()));
create policy "accounting insert payments" on public.payments for insert to authenticated with check (public.current_role() in ('super_admin','admin','comptable'));
create policy "accounting update payments" on public.payments for update to authenticated using (public.current_role() in ('super_admin','admin','comptable')) with check (public.current_role() in ('super_admin','admin','comptable'));
create policy "staff read attendance" on public.attendance for select to authenticated using (public.is_staff() or exists(select 1 from public.parent_student_links l where l.student_id=attendance.student_id and l.parent_user_id=auth.uid()));
create policy "staff insert attendance" on public.attendance for insert to authenticated with check (public.current_role() in ('super_admin','admin','directeur','censeur','enseignant'));
create policy "staff update attendance" on public.attendance for update to authenticated using (public.current_role() in ('super_admin','admin','directeur','censeur','enseignant')) with check (public.current_role() in ('super_admin','admin','directeur','censeur','enseignant'));
create policy "audit read superadmin" on public.audit_logs for select to authenticated using (public.current_role()='super_admin');
create policy "audit insert staff" on public.audit_logs for insert to authenticated with check (public.is_staff() and actor_id=auth.uid());
create policy "parent reads own links" on public.parent_student_links for select to authenticated using (parent_user_id=auth.uid() or public.current_role()='super_admin');
-- IMPORTANT : n'accordez pas de rôle admin via les métadonnées client. Créez le premier super_admin manuellement après avoir créé son utilisateur Auth, puis déployez une Edge Function vérifiant le rôle avant toute création/élévation de compte.

-- Demandes publiques d'accès : visibles uniquement par le Super Admin.
-- Une demande n'accorde jamais de rôle et ne crée pas de session de connexion.
create table if not exists public.account_requests (
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 email text not null,
 phone text not null,
 requested_role text not null check (requested_role in ('Administrateur','Directeur','Comptable','Secrétaire','Censeur','Enseignant')),
 message text not null default '',
 status text not null default 'pending' check (status in ('pending','reviewed','approved','rejected')),
 created_at timestamptz not null default now()
);
alter table public.account_requests enable row level security;
drop policy if exists "public submit account request" on public.account_requests;
create policy "public submit account request" on public.account_requests for insert to anon, authenticated with check (status='pending');
drop policy if exists "super admin read account requests" on public.account_requests;
create policy "super admin read account requests" on public.account_requests for select to authenticated using (public.current_role()='super_admin');
drop policy if exists "super admin update account requests" on public.account_requests;
create policy "super admin update account requests" on public.account_requests for update to authenticated using (public.current_role()='super_admin') with check (public.current_role()='super_admin');



-- ============================================================
-- ETAPE 2 : migration 20261029_admin_workspace_isolation_audit.sql
-- ============================================================
-- SN ProSchool : isolation stricte des espaces administrateurs et journal d'activite.
-- A executer apres les migrations precedentes dans Supabase SQL Editor.

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists created_by uuid references auth.users(id);
create index if not exists profiles_created_by_idx on public.profiles(created_by);

-- Toutes les donnees metier portent le compte qui les a creees.
alter table public.students add column if not exists created_by uuid references auth.users(id);
alter table public.grades add column if not exists created_by uuid references auth.users(id);
alter table public.payments add column if not exists created_by uuid references auth.users(id);
alter table public.attendance add column if not exists created_by uuid references auth.users(id);

-- Ces deux tables sont utilisees par l'application ; les creer si elles manquent.
create table if not exists public.staff_attendance (
 id uuid primary key default gen_random_uuid(), nom text not null, fonction text not null,
 date_presence date not null, heure_arrivee time, statut text not null, motif text,
 created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.teachers (
 id uuid primary key default gen_random_uuid(), nom text not null, matiere text not null,
 classes text not null default '', created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.staff_attendance add column if not exists created_by uuid references auth.users(id);
alter table public.teachers add column if not exists created_by uuid references auth.users(id);

create index if not exists students_created_by_idx on public.students(created_by);
create index if not exists grades_created_by_idx on public.grades(created_by);
create index if not exists payments_created_by_idx on public.payments(created_by);
create index if not exists attendance_created_by_idx on public.attendance(created_by);
create index if not exists staff_attendance_created_by_idx on public.staff_attendance(created_by);
create index if not exists teachers_created_by_idx on public.teachers(created_by);
create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_id, created_at desc);

-- Attribution automatique du createur : le navigateur ne peut pas choisir un autre proprietaire.
create or replace function public.set_record_creator() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Session utilisateur requise'; end if;
 if tg_op = 'INSERT' then new.created_by := auth.uid();
 elsif old.created_by is distinct from auth.uid() and public.current_role() <> 'super_admin' then
   raise exception 'Vous ne pouvez pas modifier les donnees d un autre compte';
 end if;
 return new;
end; $$;

-- Les donnees historiques sans createur restent visibles au Super Admin uniquement.
-- Ne pas attribuer arbitrairement les anciennes donnees a un administrateur.
do $$ declare t text; begin
 foreach t in array array['students','grades','payments','attendance','staff_attendance','teachers'] loop
   execute format('drop trigger if exists trg_creator_%I on public.%I',t,t);
   execute format('create trigger trg_creator_%I before insert or update on public.%I for each row execute function public.set_record_creator()',t,t);
 end loop;
end $$;

-- Journalise automatiquement chaque insertion, modification ou suppression metier.
create or replace function public.audit_business_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare rid text; oldj jsonb; newj jsonb;
begin
 if tg_op = 'DELETE' then rid := old.id::text; oldj := to_jsonb(old); newj := null;
 elsif tg_op = 'UPDATE' then rid := new.id::text; oldj := to_jsonb(old); newj := to_jsonb(new);
 else rid := new.id::text; oldj := null; newj := to_jsonb(new); end if;
 insert into public.audit_logs(actor_id,action,entity,entity_id,old_values,new_values)
 values(auth.uid(), lower(tg_op), tg_table_name, rid, oldj, newj);
 if tg_op = 'DELETE' then return old; else return new; end if;
end; $$;
do $$ declare t text; begin
 foreach t in array array['students','grades','payments','attendance','staff_attendance','teachers'] loop
   execute format('drop trigger if exists trg_audit_%I on public.%I',t,t);
   execute format('create trigger trg_audit_%I after insert or update or delete on public.%I for each row execute function public.audit_business_change()',t,t);
 end loop;
end $$;

-- Remplacement des anciennes politiques trop larges.
do $$ declare pol record; begin
 for pol in select tablename, policyname from pg_policies where schemaname='public' and tablename in ('students','grades','payments','attendance','staff_attendance','teachers') loop
   execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
 end loop;
end $$;

alter table public.students enable row level security;
alter table public.grades enable row level security;
alter table public.payments enable row level security;
alter table public.attendance enable row level security;
alter table public.staff_attendance enable row level security;
alter table public.teachers enable row level security;
alter table public.audit_logs enable row level security;

grant select, insert, update, delete on public.staff_attendance, public.teachers to authenticated;
grant select on public.audit_logs to authenticated;

-- Le Super Admin voit tout. Chaque autre membre du personnel ne voit et ne gere que ses lignes.
create policy students_read_owner_or_super on public.students for select to authenticated
 using (public.current_role()='super_admin' or (created_by=auth.uid() and public.is_staff()) or exists(select 1 from public.parent_student_links l where l.student_id=students.id and l.parent_user_id=auth.uid()));
create policy students_insert_owner on public.students for insert to authenticated
 with check (created_by=auth.uid() and public.current_role() in ('super_admin','admin','directeur','secretaire','censeur'));
create policy students_update_owner on public.students for update to authenticated
 using (public.current_role()='super_admin' or (created_by=auth.uid() and public.current_role() in ('admin','directeur','secretaire','censeur')))
 with check (public.current_role()='super_admin' or created_by=auth.uid());
create policy students_delete_owner on public.students for delete to authenticated
 using (public.current_role()='super_admin' or (created_by=auth.uid() and public.current_role() in ('admin','directeur')));

create policy grades_read_owner_or_super on public.grades for select to authenticated
 using (public.current_role()='super_admin' or (created_by=auth.uid() and public.is_staff()) or exists(select 1 from public.parent_student_links l where l.student_id=grades.student_id and l.parent_user_id=auth.uid()));
create policy grades_insert_owner on public.grades for insert to authenticated
 with check (created_by=auth.uid() and public.current_role() in ('super_admin','admin','directeur','censeur','enseignant') and exists(select 1 from public.students s where s.id=grades.student_id and (public.current_role()='super_admin' or s.created_by=auth.uid())));
create policy grades_update_owner on public.grades for update to authenticated
 using (public.current_role()='super_admin' or (created_by=auth.uid() and public.current_role() in ('admin','directeur','censeur','enseignant')))
 with check (public.current_role()='super_admin' or created_by=auth.uid());
create policy grades_delete_owner on public.grades for delete to authenticated using (public.current_role()='super_admin' or (created_by=auth.uid() and public.current_role() in ('admin','directeur','censeur')));

create policy payments_read_owner_or_super on public.payments for select to authenticated
 using (public.current_role()='super_admin' or (created_by=auth.uid() and public.current_role() in ('admin','directeur','comptable')) or exists(select 1 from public.parent_student_links l where l.student_id=payments.student_id and l.parent_user_id=auth.uid()));
create policy payments_insert_owner on public.payments for insert to authenticated
 with check (created_by=auth.uid() and public.current_role() in ('super_admin','admin','comptable') and exists(select 1 from public.students s where s.id=payments.student_id and (public.current_role()='super_admin' or s.created_by=auth.uid())));
create policy payments_update_owner on public.payments for update to authenticated
 using (public.current_role()='super_admin' or (created_by=auth.uid() and public.current_role() in ('admin','comptable')))
 with check (public.current_role()='super_admin' or created_by=auth.uid());
create policy payments_delete_owner on public.payments for delete to authenticated using (public.current_role()='super_admin' or (created_by=auth.uid() and public.current_role()='admin'));

create policy attendance_read_owner_or_super on public.attendance for select to authenticated
 using (public.current_role()='super_admin' or (created_by=auth.uid() and public.is_staff()) or exists(select 1 from public.parent_student_links l where l.student_id=attendance.student_id and l.parent_user_id=auth.uid()));
create policy attendance_insert_owner on public.attendance for insert to authenticated
 with check (created_by=auth.uid() and public.current_role() in ('super_admin','admin','directeur','censeur','enseignant') and exists(select 1 from public.students s where s.id=attendance.student_id and (public.current_role()='super_admin' or s.created_by=auth.uid())));
create policy attendance_update_owner on public.attendance for update to authenticated
 using (public.current_role()='super_admin' or (created_by=auth.uid() and public.current_role() in ('admin','directeur','censeur','enseignant')))
 with check (public.current_role()='super_admin' or created_by=auth.uid());
create policy attendance_delete_owner on public.attendance for delete to authenticated using (public.current_role()='super_admin' or (created_by=auth.uid() and public.current_role() in ('admin','directeur','censeur')));

create policy staff_attendance_read_owner on public.staff_attendance for select to authenticated using (public.current_role()='super_admin' or (created_by=auth.uid() and public.is_staff()));
create policy staff_attendance_insert_owner on public.staff_attendance for insert to authenticated with check (created_by=auth.uid() and public.is_staff());
create policy staff_attendance_update_owner on public.staff_attendance for update to authenticated using (public.current_role()='super_admin' or (created_by=auth.uid() and public.is_staff())) with check (public.current_role()='super_admin' or created_by=auth.uid());
create policy staff_attendance_delete_owner on public.staff_attendance for delete to authenticated using (public.current_role()='super_admin' or (created_by=auth.uid() and public.is_staff()));

create policy teachers_read_owner on public.teachers for select to authenticated using (public.current_role()='super_admin' or (created_by=auth.uid() and public.is_staff()));
create policy teachers_insert_owner on public.teachers for insert to authenticated with check (created_by=auth.uid() and public.current_role() in ('super_admin','admin','directeur','censeur'));
create policy teachers_update_owner on public.teachers for update to authenticated using (public.current_role()='super_admin' or (created_by=auth.uid() and public.current_role() in ('admin','directeur','censeur'))) with check (public.current_role()='super_admin' or created_by=auth.uid());
create policy teachers_delete_owner on public.teachers for delete to authenticated using (public.current_role()='super_admin' or (created_by=auth.uid() and public.current_role() in ('admin','directeur')));

-- Les journaux ne sont consultables que par le Super Admin ; un membre du personnel ne peut pas les lire.
drop policy if exists "audit read superadmin" on public.audit_logs;
drop policy if exists "audit insert staff" on public.audit_logs;
create policy audit_read_super_only on public.audit_logs for select to authenticated using (public.current_role()='super_admin');
create policy audit_insert_system_or_super on public.audit_logs for insert to authenticated with check (public.current_role()='super_admin' or actor_id=auth.uid());

-- Le profil d'un administrateur n'est visible que par lui-meme et le Super Admin.
drop policy if exists "profile self read" on public.profiles;
drop policy if exists "super admin read staff profiles" on public.profiles;
create policy profile_self_or_super_read on public.profiles for select to authenticated using (id=auth.uid() or public.current_role()='super_admin');


-- ============================================================
-- ETAPE 2 : migration 20261029_project64_school_features.sql
-- ============================================================
-- Migration additive pour project64 : photos/statuts élèves et pointage du personnel.
-- Sauvegarder la base avant exécution sur un projet contenant déjà des données.
alter table public.students add column if not exists photo_url text;
alter table public.students add column if not exists active boolean not null default true;
alter table public.students add column if not exists account_email text;

create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  fonction text not null check (fonction in ('Enseignant','Responsable','Directeur','Personnel administratif')),
  date_presence date not null default current_date,
  heure_arrivee time,
  statut text not null check (statut in ('Présent','Absent','En retard')),
  motif text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  matiere text not null,
  classes text not null,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.staff_attendance enable row level security;
alter table public.teachers enable row level security;

drop policy if exists "staff read staff attendance" on public.staff_attendance;
create policy "staff read staff attendance" on public.staff_attendance for select to authenticated using (public.is_staff());
drop policy if exists "authorized staff insert staff attendance" on public.staff_attendance;
create policy "authorized staff insert staff attendance" on public.staff_attendance for insert to authenticated with check (public.current_role() in ('super_admin','admin','directeur','censeur','enseignant','secretaire'));
drop policy if exists "authorized staff update staff attendance" on public.staff_attendance;
create policy "authorized staff update staff attendance" on public.staff_attendance for update to authenticated using (public.current_role() in ('super_admin','admin','directeur','censeur')) with check (public.current_role() in ('super_admin','admin','directeur','censeur'));

drop policy if exists "staff read teachers" on public.teachers;
create policy "staff read teachers" on public.teachers for select to authenticated using (public.is_staff());
drop policy if exists "admins manage teachers" on public.teachers;
create policy "admins manage teachers" on public.teachers for all to authenticated using (public.current_role() in ('super_admin','admin','directeur','censeur')) with check (public.current_role() in ('super_admin','admin','directeur','censeur'));

-- Le statut actif/inactif est géré par les politiques existantes de students.
-- La création d'un compte Auth privilégié se fait exclusivement par Edge Function.

create or replace function public.protect_student_active_status() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if old.active is distinct from new.active and coalesce(public.current_role()::text, '') <> 'super_admin' then
    raise exception 'Seul le Super Admin peut modifier le statut actif/inactif d’un élève.';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_student_active_status_trigger on public.students;
create trigger protect_student_active_status_trigger before update on public.students
for each row execute function public.protect_student_active_status();


-- ============================================================
-- ETAPE 2 : migration 20261029_record_locking_and_adc.sql
-- ============================================================
-- Verrouillage automatique des enregistrements métier et contrôle exclusif du Super Admin.
-- À exécuter après 20261029_admin_workspace_isolation_audit.sql.
do $$ declare t text; begin
 foreach t in array array['students','grades','payments','attendance','staff_attendance','teachers'] loop
   execute format('alter table public.%I add column if not exists is_locked boolean not null default true',t);
   execute format('alter table public.%I add column if not exists locked_at timestamptz not null default now()',t);
   execute format('alter table public.%I add column if not exists locked_by uuid references auth.users(id)',t);
 end loop;
end $$;

create or replace function public.enforce_record_lock() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
   new.is_locked := true;
   new.locked_at := now();
   new.locked_by := auth.uid();
   return new;
 end if;
 if public.current_role()='super_admin' then
   if new.is_locked and not old.is_locked then
     new.locked_at := now(); new.locked_by := auth.uid();
   elsif not new.is_locked then
     new.locked_at := null; new.locked_by := null;
   end if;
   return new;
 end if;
 if old.is_locked then
   raise exception 'Enregistrement verrouillé : seul le Super Admin peut autoriser une correction.' using errcode='42501';
 end if;
 -- Une correction autorisée est automatiquement reverrouillée après son enregistrement.
 new.is_locked := true; new.locked_at := now(); new.locked_by := auth.uid();
 return new;
end; $$;

do $$ declare t text; begin
 foreach t in array array['students','grades','payments','attendance','staff_attendance','teachers'] loop
   execute format('drop trigger if exists trg_enforce_record_lock on public.%I',t);
   execute format('create trigger trg_enforce_record_lock before insert or update on public.%I for each row execute function public.enforce_record_lock()',t);
 end loop;
end $$;

-- RPC utilisée par l'interface Super Admin pour ouvrir temporairement une fiche à correction,
-- ou la reverrouiller. Les noms de tables sont limités à une liste autorisée.
create or replace function public.set_business_record_lock(p_table text,p_id uuid,p_locked boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or public.current_role()<>'super_admin' then
   raise exception 'Action réservée au Super Admin.' using errcode='42501';
 end if;
 if p_table not in ('students','grades','payments','attendance','staff_attendance','teachers') then
   raise exception 'Table non autorisée.';
 end if;
 execute format('update public.%I set is_locked=$1, locked_at=case when $1 then now() else null end, locked_by=case when $1 then auth.uid() else null end where id=$2',p_table)
 using p_locked,p_id;
 if not found then raise exception 'Enregistrement introuvable.'; end if;
 insert into public.audit_logs(actor_id,action,entity,entity_id,new_values)
 values(auth.uid(),case when p_locked then 'lock' else 'unlock_for_correction' end,p_table,p_id::text,jsonb_build_object('is_locked',p_locked));
end; $$;
revoke all on function public.set_business_record_lock(text,uuid,boolean) from public;
grant execute on function public.set_business_record_lock(text,uuid,boolean) to authenticated;


-- ============================================================
-- ETAPE 2 : migration 20261029_super_admin_account_controls.sql
-- ============================================================
-- SN ProSchool: administration sécurisée des comptes du personnel.
-- À exécuter dans Supabase SQL Editor avant de déployer la fonction Edge.
alter table public.profiles add column if not exists email text;
create index if not exists profiles_email_idx on public.profiles (lower(email));

-- Synchronise les e-mails des comptes déjà présents, sans toucher aux mots de passe.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and (p.email is null or p.email = '');

-- Seul le Super Admin actif peut consulter les profils du personnel.
-- Cette politique complète la politique existante de lecture de son propre profil.
drop policy if exists "super admin read staff profiles" on public.profiles;
create policy "super admin read staff profiles"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or (
    public.current_role() = 'super_admin'
    and role in ('super_admin','admin','directeur','comptable','secretaire','censeur','enseignant')
  )
);


-- ============================================================
-- ETAPE 2 : migration 20261030_account_requests.sql
-- ============================================================
-- SN ProSchool : demandes publiques de compte, réservées à la validation du Super Admin.
create table if not exists public.account_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  requested_role text not null check (requested_role in ('Administrateur','Directeur','Comptable','Secrétaire','Censeur','Enseignant')),
  message text not null default '',
  status text not null default 'pending' check (status in ('pending','reviewed','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.account_requests enable row level security;

drop policy if exists "public submit account request" on public.account_requests;
create policy "public submit account request"
  on public.account_requests for insert to anon, authenticated
  with check (status = 'pending');

drop policy if exists "super admin read account requests" on public.account_requests;
create policy "super admin read account requests"
  on public.account_requests for select to authenticated
  using (public.current_role() = 'super_admin');

drop policy if exists "super admin update account requests" on public.account_requests;
create policy "super admin update account requests"
  on public.account_requests for update to authenticated
  using (public.current_role() = 'super_admin')
  with check (public.current_role() = 'super_admin');


-- ============================================================
-- ETAPE 2 : migration 20261030_add_management_roles.sql
-- ============================================================
-- Ajouter les rôles de direction pédagogique et de surveillance.
-- Exécuter ce fichier séparément, puis le fichier 20261030_staff_attendance_and_audit_fix.sql.
alter type public.app_role add value if not exists 'directeur_etudes';
alter type public.app_role add value if not exists 'surveillant_general';

alter type public.app_role add value if not exists 'surveillant_general_adjoint';
alter type public.app_role add value if not exists 'personnel_administratif';
alter type public.app_role add value if not exists 'agent_securite';
alter type public.app_role add value if not exists 'agent_entretien';


-- ============================================================
-- ETAPE 2 : migration 20261030_extend_staff_roles.sql
-- ============================================================
-- Ajouter les fonctions du personnel demandées.
-- Exécuter cette migration, puis redéployer create-staff-account.
alter type public.app_role add value if not exists 'surveillant_general_adjoint';
alter type public.app_role add value if not exists 'personnel_administratif';
alter type public.app_role add value if not exists 'agent_securite';
alter type public.app_role add value if not exists 'agent_entretien';

-- Les candidats peuvent demander ces fonctions depuis la page de connexion.
alter table public.account_requests drop constraint if exists account_requests_requested_role_check;
alter table public.account_requests add constraint account_requests_requested_role_check
 check (requested_role in (
  'Administrateur','Directeur','Directeur des études','Surveillant général',
  'Surveillant général adjoint','Personnel administratif','Agent de sécurité',
  'Agent d’entretien','Comptable','Secrétaire','Censeur','Enseignant'
 ));

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path=public as $$
 select coalesce(public.current_role() in (
  'super_admin','admin','directeur','directeur_etudes','surveillant_general',
  'surveillant_general_adjoint','personnel_administratif','agent_securite',
  'agent_entretien','comptable','secretaire','censeur','enseignant'
 ),false)
$$;


-- ============================================================
-- ETAPE 2 : migration 20261030_fix_staff_account_login.sql
-- ============================================================
-- SN ProSchool : réparer la création des profils du personnel.
-- À exécuter dans Supabase SQL Editor AVANT de redéployer create-staff-account.
-- La fonction Edge create-staff-account écrit ces colonnes après avoir créé auth.users.

alter table public.profiles
  add column if not exists email text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists must_change_password boolean not null default true,
  add column if not exists active boolean not null default true;

create index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

-- Renseigner les e-mails des profils existants à partir d'Auth.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and (p.email is null or p.email = '');

-- Les comptes du personnel créés par la fonction Edge doivent être visibles
-- par le Super Admin qui les gère. L'utilisateur conserve aussi la lecture
-- de son propre profil pour le contrôle de connexion.
drop policy if exists "super admin read staff profiles" on public.profiles;
create policy "super admin read staff profiles"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or (
    public.current_role() = 'super_admin'
    and role in ('super_admin','admin','directeur','comptable','secretaire','censeur','enseignant')
  )
);


-- ============================================================
-- ETAPE 2 : migration 20261030_parent_portal_matricule.sql
-- ============================================================
-- Portail parent : vérification du matricule et du téléphone du parent.
-- La fonction renvoie uniquement le dossier correspondant et ne donne aucun accès SQL direct aux tables.
create or replace function public.parent_portal_lookup(p_matricule text, p_parent_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_phone text;
begin
  v_phone := regexp_replace(coalesce(p_parent_phone,''), '[^0-9]', '', 'g');
  if length(v_phone) < 6 or length(coalesce(p_matricule,'')) < 5 then
    return jsonb_build_object('error','invalid_credentials');
  end if;

  select * into v_student
  from public.students s
  where upper(s.matricule) = upper(trim(p_matricule))
    and regexp_replace(coalesce(s.telephone,''), '[^0-9]', '', 'g') = v_phone
    and coalesce(s.active,true) = true
  limit 1;

  if not found then
    return jsonb_build_object('error','not_found');
  end if;

  return jsonb_build_object(
    'student', jsonb_build_object(
      'id',v_student.id,'matricule',v_student.matricule,'nom',v_student.nom,
      'prenom',v_student.prenom,'cycle',v_student.cycle,'classe',v_student.classe
    ),
    'grades', coalesce((select jsonb_agg(jsonb_build_object(
      'id',g.id,'matiere',g.matiere,'note',g.note,'bareme',g.bareme,
      'coefficient',g.coefficient,'periode',g.periode
    ) order by g.periode,g.matiere) from public.grades g where g.student_id=v_student.id),'[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'motif',p.motif,'montant',p.montant,'date_paiement',p.date_paiement,
      'mode',p.mode,'reference',p.reference
    ) order by p.date_paiement desc) from public.payments p where p.student_id=v_student.id and p.status='validé'),'[]'::jsonb),
    'attendance', coalesce((select jsonb_agg(jsonb_build_object(
      'id',a.id,'date_presence',a.date_presence,'statut',a.statut,'motif',a.motif
    ) order by a.date_presence desc) from public.attendance a where a.student_id=v_student.id),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.parent_portal_lookup(text,text) from public;
grant execute on function public.parent_portal_lookup(text,text) to anon, authenticated;


-- ============================================================
-- ETAPE 2 : migration 20261030_staff_attendance_and_audit_fix.sql
-- ============================================================
-- SN ProSchool : pointage enrichi et journal d'activité centralisé.
-- À exécuter après 20261030_add_management_roles.sql.

alter table public.staff_attendance add column if not exists jour text;
alter table public.staff_attendance add column if not exists salle text;
alter table public.staff_attendance add column if not exists matiere text;
alter table public.staff_attendance add column if not exists heure_depart time;

create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_id, created_at desc);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path=public as $$
 select coalesce(public.current_role() in ('super_admin','admin','directeur','directeur_etudes','surveillant_general','surveillant_general_adjoint','personnel_administratif','agent_securite','agent_entretien','comptable','secretaire','censeur','enseignant'),false)
$$;

-- Audit automatique des données métier. Chaque ligne indique le compte qui a fait l'opération.
create or replace function public.audit_business_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare rid text; oldj jsonb; newj jsonb;
begin
 if tg_op='DELETE' then rid:=old.id::text; oldj:=to_jsonb(old); newj:=null;
 elsif tg_op='UPDATE' then rid:=new.id::text; oldj:=to_jsonb(old); newj:=to_jsonb(new);
 else rid:=new.id::text; oldj:=null; newj:=to_jsonb(new); end if;
 insert into public.audit_logs(actor_id,action,entity,entity_id,old_values,new_values)
 values(auth.uid(),lower(tg_op),tg_table_name,rid,oldj,newj);
 if tg_op='DELETE' then return old; else return new; end if;
end; $$;

do $$ declare t text; begin
 foreach t in array array['students','grades','payments','attendance','staff_attendance','teachers'] loop
  execute format('drop trigger if exists trg_audit_%I on public.%I',t,t);
  execute format('create trigger trg_audit_%I after insert or update or delete on public.%I for each row execute function public.audit_business_change()',t,t);
 end loop;
end $$;

-- Les nouvelles fonctions sont incluses dans le contrôle d'accès global.

-- Autoriser les deux nouveaux rôles dans les demandes d'accès publiques.
do $$ begin
 alter table public.account_requests drop constraint if exists account_requests_requested_role_check;
 alter table public.account_requests add constraint account_requests_requested_role_check
 check (requested_role in ('Administrateur','Directeur','Directeur des études','Surveillant général','Surveillant général adjoint','Personnel administratif','Agent de sécurité','Agent d’entretien','Comptable','Secrétaire','Censeur','Enseignant'));
end $$;


-- ============================================================
-- ETAPE 2 : migration 20261030_staff_session_tracking.sql
-- ============================================================
-- Suivi des sessions du personnel : horodatages serveur et présence par heartbeat.
create table if not exists public.staff_sessions (
  id uuid primary key default gen_random_uuid(),
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
alter table public.staff_sessions enable row level security;
grant select, insert, update on public.staff_sessions to authenticated;
drop policy if exists staff_sessions_super_read on public.staff_sessions;
drop policy if exists staff_sessions_self_insert on public.staff_sessions;
drop policy if exists staff_sessions_self_update on public.staff_sessions;
create policy staff_sessions_super_read on public.staff_sessions
  for select to authenticated using (public.current_role() = 'super_admin');
create policy staff_sessions_self_insert on public.staff_sessions
  for insert to authenticated with check (user_id = auth.uid() and public.is_staff());
create policy staff_sessions_self_update on public.staff_sessions
  for update to authenticated using (user_id = auth.uid() and public.is_staff())
  with check (user_id = auth.uid() and public.is_staff());


-- ============================================================
-- ETAPE 2 : migration 20261030_student_matricule_sequence.sql
-- ============================================================
-- Attribution centralisée et sans collision des matricules élèves.
-- Le trigger s'applique aussi aux inscriptions réalisées depuis plusieurs postes.
create or replace function public.assign_student_matricule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text := to_char(current_date, 'YYYY');
  v_next integer;
begin
  -- Sérialise la génération pour éviter deux matricules identiques en cas d'inscriptions simultanées.
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

-- La contrainte unique est déjà déclarée dans le schéma initial ; cet index protège aussi
-- les bases où la table avait été créée par une ancienne migration.
create unique index if not exists students_matricule_unique_idx on public.students (upper(matricule));


-- ============================================================
-- ETAPE 2 : migration 20261030_super_admin_manage_audit_logs.sql
-- ============================================================
-- Autorise uniquement un Super Admin actif à supprimer des lignes du journal.
-- La lecture reste réservée au Super Admin ; l'insertion métier existante reste inchangée.
drop policy if exists audit_delete_super_only on public.audit_logs;
create policy audit_delete_super_only
on public.audit_logs
for delete
to authenticated
using (public.current_role() = 'super_admin');

-- Empêche les utilisateurs non Super Admin de modifier les entrées déjà journalisées.
revoke update on public.audit_logs from authenticated;
-- Le privilège SQL DELETE est nécessaire en plus de la policy RLS.
grant delete on public.audit_logs to authenticated;


-- ============================================================
-- ETAPE 2 : migration 20261030_teachers_cycle_salle.sql
-- ============================================================
-- Ajouter le cycle et la salle au référentiel des enseignants.
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS cycle text,
  ADD COLUMN IF NOT EXISTS salle text;

-- Les anciennes lignes restent valides ; les nouveaux formulaires renseignent ces colonnes.


-- ETAPE FINALE OPTIONNELLE : compte Super Administrateur initial
-- Créez d'abord l'utilisateur norielsayet008@gmail.com dans Supabase > Authentication > Users.
-- Si le compte existe déjà, ce bloc lui attribue le rôle super_admin.
-- S'il n'existe pas encore, le script d'installation continue sans erreur ;
-- après création du compte, exécutez uniquement ce bloc final.
DO $$
DECLARE updated_count integer;
BEGIN
  UPDATE public.profiles AS p
  SET role = 'super_admin', active = true, must_change_password = false
  FROM auth.users AS u
  WHERE p.id = u.id
    AND lower(u.email) = lower('norielsayet008@gmail.com');
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count = 0 THEN
    RAISE NOTICE 'Compte Super Administrateur non trouvé. Créez-le dans Authentication > Users, puis exécutez à nouveau uniquement le bloc ETAPE FINALE.';
  ELSE
    RAISE NOTICE 'Le compte initial a reçu le rôle super_admin.';
  END IF;
END $$;
