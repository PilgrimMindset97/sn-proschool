# SN ProSchool — contenu du projet complet

Ce dossier est la racine du projet Vite/React. Ouvrir ce dossier dans VS Code (celui qui contient package.json).

## Fichiers essentiels
- `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json` : configuration et commandes de l’application.
- `src/App.tsx`, `src/main.tsx`, `src/style.css`, `src/supabase.ts` : application et connexion Supabase.
- `.env.example` : modèle de configuration des clés publiques Supabase. Créer un fichier `.env` local et renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. Ne jamais mettre la clé `service_role` dans le navigateur.
- `BASE-DE-DONNEES-SN-PROSCHOOL.sql` : fichier SQL unique d’installation sur une base Supabase neuve. Une copie identique se trouve dans `supabase/INSTALLATION_UNIQUE_SUPABASE.sql`.
- `supabase/functions/` : fonctions serveur pour créer et gérer les comptes du personnel.
- `supabase/migrations/` : historique des évolutions SQL ; ne pas les exécuter en plus du script d’installation sur une base neuve.
- `supabase/setup_super_admin.sql` : étape de configuration du Super Administrateur après création de son utilisateur Auth, selon les instructions.
- `docs/` et fichiers `.md` : documentation et notes de fonctionnement.

## Installation locale
1. Installer Node.js LTS.
2. Dans ce dossier, exécuter `npm install`.
3. Copier `.env.example` vers `.env` et renseigner les valeurs Supabase.
4. Dans Supabase SQL Editor, exécuter une seule fois `BASE-DE-DONNEES-SN-PROSCHOOL.sql` sur une base neuve.
5. Lancer `npm run dev`.
6. Pour vérifier la compilation, lancer `npm run build`.

## Important
Le projet fourni utilise Supabase/PostgreSQL comme base principale. Les fichiers sous `php/` et `mysql/` sont des éléments documentaires/anciens exemples et ne constituent pas un second backend prêt à l’emploi. Ce paquet ne transfère pas automatiquement les données d’une ancienne base distante. Le build et le déploiement Supabase doivent être vérifiés dans l’environnement réel du projet.
