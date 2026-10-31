# SN ProSchool — Journal Super Admin, pointage et fonctions du personnel

Cette version regroupe le portail parent (matricules, bulletins et relevés) et les fonctions de suivi administratif demandées.

## Journal global du Super Admin
- Le journal d'administration affiche la date/heure, le compte auteur, sa fonction, l'action, le module et la référence de l'enregistrement.
- Des triggers PostgreSQL enregistrent automatiquement les INSERT, UPDATE et DELETE sur `students`, `grades`, `payments`, `attendance`, `staff_attendance` et `teachers`.
- La création de comptes du personnel est journalisée par la fonction Edge `create-staff-account`; les opérations de gestion des comptes sont journalisées par `manage-staff-account`.
- Les mots de passe ne sont pas copiés dans le journal.
- La lecture du journal est réservée au rôle Super Admin via RLS.

## Pointage des enseignants et du personnel
Le formulaire comporte le nom complet, la fonction, la date, le jour, la salle/classe, la matière, l'heure d'arrivée, l'heure de départ, le statut et le commentaire. Pour un enseignant, jour, salle, matière et heure de départ sont obligatoires.

## Fonctions du personnel
Les rôles gérés comprennent : Administrateur, Directeur, Directeur des études, Surveillant général, Surveillant général adjoint, Personnel administratif, Agent de sécurité, Agent d'entretien, Comptable, Secrétaire, Censeur et Enseignant. Le rôle affiché dans les sessions et le journal est lu depuis `profiles.role`.

## Migrations Supabase
Appliquer les migrations du dossier `supabase/migrations` dans l'ordre chronologique (du plus ancien au plus récent), notamment :
- `20261029_admin_workspace_isolation_audit.sql`
- `20261030_extend_staff_roles.sql`
- `20261030_staff_session_tracking.sql`
- `20261030_staff_attendance_and_audit_fix.sql`
- `20261030_parent_portal_matricule.sql`
- `20261030_student_matricule_sequence.sql`

Déployer ensuite les fonctions Edge `create-staff-account` et `manage-staff-account`.

## Limites de validation
L'archive est un paquet source. Le contrôle d'intégrité ZIP est effectué. La compilation complète et les tests de bout en bout sur un projet Supabase réel ne sont pas certifiés dans cet environnement. Les journaux d'audit centralisés nécessitent l'application des migrations et l'utilisation de Supabase Auth; le mode local de démonstration conserve ses événements dans le navigateur et ne fournit pas un journal central multi-utilisateur.
