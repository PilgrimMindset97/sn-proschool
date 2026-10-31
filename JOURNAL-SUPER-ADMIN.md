# Journal global — commandes Super Admin

- Le journal global est affiché dans Administration et réservé au rôle `super_admin`.
- Le Super Admin peut ajouter une entrée manuelle (action, module, référence et commentaire), supprimer une entrée ou vider le journal après confirmation.
- Les suppressions sont autorisées en base par la migration `20261030_super_admin_manage_audit_logs.sql`, via une policy RLS réservée au Super Admin.
- Les comptes locaux de démonstration utilisent le stockage local du navigateur ; les entrées ne sont pas synchronisées avec Supabase.
- La gestion des comptes conserve l'action « Modifier le mot de passe » : elle réinitialise le mot de passe du compte ciblé via Supabase Auth, sans jamais révéler le mot de passe actuel. Minimum 8 caractères.
- Les mots de passe ne doivent jamais être inscrits dans le journal.

## Déploiement Supabase

Appliquer les migrations SQL du projet, notamment `20261030_super_admin_manage_audit_logs.sql`, puis déployer les Edge Functions `manage-staff-account` et `create-staff-account` si elles ont été modifiées ou ne sont pas encore déployées.
