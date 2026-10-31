# SN ProSchool — Project64 (préparation MySQL/XAMPP)

Cette archive conserve le code React/Vite fourni et ajoute les huit séries du lycée ainsi qu'un schéma MySQL initial et les consignes de migration.

## Séries ajoutées
Seconde A, Seconde C, Première A, Première D, Première C, Terminale A, Terminale D, Terminale C.

## Importer la base
1. Démarrer Apache et MySQL dans XAMPP.
2. Ouvrir `http://localhost/phpmyadmin`.
3. Importer `mysql/schema.mysql.sql` (le script crée `sn_proschool`).
4. Copier `php/config/database.example.php` en `php/config/database.php` et adapter les paramètres.

## État technique à connaître
Le projet d'origine appelle encore Supabase dans `src/App.tsx` pour l'authentification et les opérations métier. Le schéma MySQL et la configuration PDO ajoutés ici ne suffisent donc pas à faire fonctionner l'application avec MySQL. La conversion complète de tous les appels vers une API PHP reste à réaliser. Les consignes détaillées pour Bolt sont dans `docs/CONTINUATION-MYSQL-PROJECT64-FR.md`.

Ne saisissez pas de vraies données scolaires tant que l'API PHP, les autorisations côté serveur, les tests d'accès parents/personnel et la migration de tous les appels ne sont pas terminés.
