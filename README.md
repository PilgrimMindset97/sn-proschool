# IMPORTANT — BASE DE DONNÉES UNIQUE

SN ProSchool utilise désormais un seul backend de données : **Supabase / PostgreSQL**. Consulte `README-BASE-UNIQUE.md` et installe `supabase/INSTALLATION_UNIQUE_SUPABASE.sql` sur un projet Supabase neuf. Les anciens scripts MySQL ne constituent plus une deuxième base du projet.

# SN ProSchool — logiciel web de gestion scolaire

Application React + TypeScript + Vite préparée pour un déploiement web avec Supabase. Cycles inclus : maternelle, primaire, collège et lycée.

## Fonctions incluses dans ce socle

- Tableau de bord scolaire.
- Gestion des fiches élèves et génération de matricules.
- Statut **Actif / Inactif** pour chaque élève, sauvegardé dans Supabase lorsque la base est configurée, avec filtres par statut.
- Saisie des notes et calcul pondéré des moyennes sur 20.
- Enregistrement des paiements et références de reçu.
- Suivi des présences et absences.
- Rapports imprimables depuis le navigateur.
- Connexion par e-mail et mot de passe via Supabase Auth.
- Règles Row Level Security (RLS) de départ dans `supabase/schema.sql`.
- Configuration de déploiement pour Netlify et Vercel.
- L'ancienne maquette HTML locale est conservée dans `public/prototype-locale.html`.

> **État actuel :** le projet est préparé pour être configuré et déployé, mais il n'est pas encore en ligne et n'est pas connecté à un projet Supabase réel. Il faut renseigner les identifiants publics du projet et lancer le déploiement. Les espaces complets enseignant/parent, les workflows avancés de bulletins, les rapports Excel/PDF dédiés, les salaires, les notifications et les outils d'audit complets restent à développer/tester avant une utilisation scolaire en production.


## Connexion, création de compte et mode aperçu local

- L’écran de connexion affiche l’adresse `norielsayet008@gmail.com` par défaut et comprend un bouton **Créer un compte**.
- Sans configuration Supabase, le projet propose un mode de démonstration local. Identifiants de démonstration : `norielsayet008@gmail.com` / `12345`. **Ces identifiants sont codés uniquement pour l’aperçu local et ne sont pas sécurisés. Ne déployez jamais ce mode comme système d’authentification de production et changez/supprimez ces identifiants avant publication.**
- La création de compte en mode local ouvre une session d’aperçu temporaire pour visualiser l’interface. Elle ne crée pas de compte serveur et n’accorde aucun accès réel.
- Lorsque Supabase est configuré, la connexion est vérifiée par Supabase Auth et l’application contrôle que le profil est actif et appartient au personnel autorisé. Les inscriptions publiques via le formulaire sont des comptes parent par défaut, jamais des administrateurs.
- Le super administrateur peut se déconnecter depuis le menu latéral. Après déconnexion, l’application revient à l’écran de connexion.
- Avant tout déploiement, configurez Supabase, créez le compte réel dans Authentication → Users et exécutez `supabase/setup_super_admin.sql`. N’utilisez pas le mot de passe de démonstration en production.

## 1. Préparer Supabase

1. Créez un projet sur [Supabase](https://supabase.com/).
2. Dans **SQL Editor**, exécutez le fichier `supabase/schema.sql` une seule fois sur ce projet.
3. Dans **Authentication → Users**, créez l'utilisateur administrateur avec une adresse e-mail et un mot de passe robuste que vous seul connaissez.
4. Dans le SQL Editor, attribuez le rôle super administrateur au compte nouvellement créé en remplaçant l'adresse ci-dessous par l'adresse réelle :

```sql
update public.profiles p
set role = 'super_admin', active = true, must_change_password = true
where p.id = (
  select u.id from auth.users u
  where lower(u.email) = lower('ADMIN@VOTRE-ECOLE.CG')
  limit 1
);
```

Vérifiez que la requête a modifié exactement une ligne. Ne mettez jamais le mot de passe dans le code ni dans Git.

## 2. Configurer l'application

1. Copiez `.env.example` vers `.env.local` à la racine du projet.
2. Dans **Supabase → Project Settings → API**, copiez l'URL du projet et la clé publique `anon`/publishable dans `.env.local` :

```dotenv
VITE_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE_CLE_PUBLIQUE
```

3. La clé publique est destinée au navigateur et ne remplace jamais les politiques RLS. **N'utilisez jamais `service_role` ou une clé secrète `sb_secret_` dans le navigateur.**

## 3. Tester sur votre ordinateur ou dans Bolt

Prérequis : Node.js LTS et npm.

```bash
npm install
npm run dev
```

Pour vérifier la compilation :

```bash
npm run build
npm run preview
```

Sans Supabase, le projet démarre en mode aperçu local avec les identifiants de démonstration documentés plus haut. Ce mode est destiné uniquement à visualiser l’interface et utilise des données locales du navigateur; il ne doit jamais être publié en production.


## 4. Déployer localement avec XAMPP (Apache)

Cette application est construite avec React/Vite : Apache ne sert pas directement les fichiers `.tsx`. Il faut d’abord compiler le projet avec Node.js, puis copier le contenu du dossier `dist` dans le répertoire web d’Apache. Supabase reste la base de données utilisée par l’application dans cette configuration.

1. Installez et ouvrez XAMPP Control Panel depuis le site officiel Apache Friends.
2. Dans le dossier du projet (celui qui contient `package.json`), configurez `.env` à partir de `.env.example` avec l’URL et la clé **publique** Supabase.
3. Ouvrez un terminal dans ce dossier et exécutez `npm install`, puis `npm run build`.
4. Créez le dossier `C:\xampp\htdocs\project33` s’il n’existe pas.
5. Copiez **le contenu** du dossier `dist` (y compris `index.html` et le dossier `assets`) dans `C:\xampp\htdocs\project33` — ne copiez pas uniquement le dossier `dist`.
6. Dans XAMPP Control Panel, cliquez sur **Start** pour Apache. MySQL peut rester arrêté tant que Supabase est utilisé.
7. Ouvrez `http://localhost/project33/` dans Chrome.

Si Apache ne démarre pas, le port 80 peut être utilisé par un autre service. Vérifiez que les variables Supabase sont configurées avant `npm run build`, puis reconstruisez et recopiez `dist`. Ne placez jamais de clé `service_role` ou de clé secrète dans le code du navigateur.

Pour une base MySQL locale XAMPP à la place de Supabase, il faut créer une API PHP côté serveur et migrer les opérations de données : le frontend React ne doit jamais se connecter directement à MySQL.

## 5. Déployer sur Internet

### Option A — Netlify

1. Envoyez le dossier du projet dans un dépôt GitHub.
2. Dans Netlify, créez un site depuis ce dépôt.
3. Commande de build : `npm run build`.
4. Dossier de publication : `dist`.
5. Dans les variables d'environnement du site, ajoutez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
6. Lancez le déploiement. Le fichier `netlify.toml` configure le routage de l'application.

### Option B — Vercel

1. Importez le dépôt GitHub dans Vercel.
2. Vérifiez que le framework détecté est Vite, la commande de build `npm run build` et le dossier de sortie `dist`.
3. Ajoutez les deux variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les paramètres du projet.
4. Lancez le déploiement. `vercel.json` contient la configuration de base.

Après chaque changement des variables d'environnement, relancez un déploiement.

## 5. Vérifications avant de saisir de vraies données

- Tester la connexion et la déconnexion avec un compte autorisé.
- Tester la création d'un élève et le passage Actif → Inactif puis Inactif → Actif sur deux appareils différents.
- Vérifier les permissions RLS pour chaque rôle et confirmer qu'un compte parent ne peut pas lire les dossiers d'autres élèves.
- Vérifier les suppressions, les sauvegardes, la récupération de compte et les journaux d'audit.
- Ne pas charger de données réelles d'enfants tant que ces tests ne sont pas réussis.

Le schéma SQL est un point de départ à vérifier pour l'établissement et les règles locales. Les opérations sensibles de gestion des rôles doivent être réalisées côté serveur ou par un administrateur de base de données, jamais à partir d'une valeur envoyée par le navigateur.

### Configurer le compte du super administrateur

1. Dans Supabase, ouvrez **Authentication → Users → Add user** et créez l'utilisateur `norielsayet008@gmail.com` avec un mot de passe fort choisi en privé. Ne mettez jamais ce mot de passe dans le code, le dépôt Git ou le fichier `.env`.
2. Confirmez l'utilisateur si votre configuration Supabase l'exige.
3. Après la création, ouvrez **SQL Editor** et attribuez le rôle au compte correspondant avec cette requête, en remplaçant `UUID_UTILISATEUR` par l'ID de l'utilisateur affiché dans Authentication → Users :

```sql
insert into public.profiles (id, full_name, role, active, must_change_password)
values ('UUID_UTILISATEUR', 'Super administrateur SN', 'super_admin', true, true)
on conflict (id) do update
set role = 'super_admin', active = true, must_change_password = true;
```

N'exécutez cette requête qu'après avoir vérifié que l'ID appartient bien à votre compte. Désactivez les inscriptions publiques dans **Authentication → Sign In / Providers** si seuls les comptes créés par un administrateur sont autorisés.

L'adresse e-mail est préremplie sur l'écran de connexion pour faciliter l'accès. L'authentification réelle est assurée par `supabase.auth.signInWithPassword`; aucun mot de passe n'est codé dans l'application. La clé `anon`/publishable Supabase peut être dans le frontend, mais ne mettez jamais la clé `service_role` dans le frontend.


## Configuration de l’authentification sécurisée (obligatoire)

1. Créez un projet Supabase et ouvrez **Project Settings → API** (ou **Connect** selon l’interface).
2. Copiez `.env.example` vers `.env.local` et renseignez `VITE_SUPABASE_URL` et la clé publique `anon`/`publishable`. Ne placez jamais une clé `service_role`/secret dans une application navigateur.
3. Dans Supabase **Authentication → Users**, créez le compte `norielsayet008@gmail.com` et définissez son mot de passe dans Supabase. Aucun mot de passe n’est inclus dans le code du projet.
4. Dans **SQL Editor**, exécutez `supabase/schema.sql` sur le projet.
5. Ensuite, exécutez `supabase/setup_super_admin.sql` pour attribuer le rôle `super_admin` au compte initial. Le script échoue si l’utilisateur/profil n’existe pas.
6. Redémarrez le serveur Vite après modification des variables (`npm run dev`). Si les variables Supabase sont absentes, l’application revient au mode aperçu local; avant toute publication, configurez Supabase et supprimez/désactivez les identifiants de démonstration dans `src/App.tsx`.
7. Testez les rôles et les politiques RLS avec des comptes séparés avant d’ajouter de vraies données scolaires. Les autorisations de base de données doivent rester la source d’autorité ; cacher un bouton dans l’interface ne sécurise pas les données.

**Important :** la clé publique est destinée au navigateur uniquement avec des politiques RLS correctes. Ne publiez jamais `.env.local`. Les valeurs `VITE_*` sont incorporées au bundle client lors de la compilation ; n’y stockez aucun secret.

## Mise à jour additive de project64 (29 octobre 2026)

Cette version conserve le projet React/Vite et ajoute des champs et vues de gestion scolaire. Avant de mettre à jour une base existante, exportez une sauvegarde Supabase, puis exécutez le fichier `supabase/migrations/20261029_project64_school_features.sql` dans le SQL Editor.

La création de comptes administrateurs depuis l’interface nécessite le déploiement de la fonction serveur sécurisée :

```bash
supabase functions deploy create-staff-account
```

La fonction utilise les secrets du projet Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) côté serveur. Ne placez jamais la clé `service_role` dans le fichier `.env` du navigateur. Le compte qui exécute la création doit avoir le rôle `super_admin` actif dans `public.profiles`.

Les photos sélectionnées dans l’interface sont actuellement enregistrées dans le champ `photo_url` sous forme de donnée image; pour une production avec beaucoup d’élèves, il est recommandé de configurer Supabase Storage et de remplacer ce stockage direct par des URL sécurisées. Le champ e-mail du dossier élève est conservé, mais la création d’un identifiant Auth distinct pour chaque élève et son portail de connexion doivent être configurés séparément avant de présenter cette fonction comme une authentification élève complète.

Le build complet n’a pas pu être exécuté dans l’environnement de préparation, car le registre npm était inaccessible (erreur DNS `EAI_AGAIN`). Le code TSX a toutefois été analysé par le transpileur TypeScript pour vérifier sa syntaxe; effectuez `npm install` puis `npm run build` dans votre environnement avant le déploiement.


### Catalogue des matières
Le module Notes comprend désormais un catalogue initial par cycle et par niveau (maternelle, primaire, collège et lycée). Les matières proposées dans la saisie des notes sont filtrées selon la classe de l’élève. Les enseignants choisissent une matière dans ce catalogue. Vérifiez et adaptez les matières, notamment au lycée, aux programmes officiels congolais et aux séries réellement proposées par votre établissement.


## Contrôle des comptes par le Super Admin

Pour activer le blocage/déblocage des comptes du personnel et la réinitialisation de leur mot de passe :

1. Exécutez `supabase/migrations/20261029_super_admin_account_controls.sql` dans le SQL Editor du projet Supabase.
2. Déployez les fonctions Edge `create-staff-account` et `manage-staff-account`. La fonction de gestion nécessite les secrets serveur `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` configurés dans Supabase. La clé service-role ne doit jamais être mise dans le navigateur.
3. Connectez-vous avec un profil `super_admin` actif, ouvrez **Administrateurs**, puis actualisez la liste. Vous pourrez bloquer/débloquer les comptes du personnel et réinitialiser leur mot de passe. Le mot de passe n'est jamais écrit dans le journal d'audit.
4. Les comptes Super Admin sont protégés par l'interface de gestion : ils ne peuvent pas être bloqués ou réinitialisés depuis cette liste. Le mot de passe réinitialisé doit être transmis au titulaire par un canal sécurisé. Le mot de passe lui-même n’est jamais conservé dans le journal d’audit.

Le blocage désactive `profiles.active`. Les contrôles de rôle/RLS doivent rester activés et être testés dans le projet Supabase avant l'utilisation en production.


### Contrôle des comptes par le Super Admin

Dans le module **Administrateurs**, la liste se charge automatiquement à l’ouverture. Le Super Admin voit le nombre total de comptes, les comptes actifs et les comptes bloqués, et peut rechercher un compte par nom, e-mail ou rôle. Il peut bloquer/débloquer les comptes du personnel et réinitialiser leur mot de passe.

Pour activer ce contrôle sur Supabase :
1. Exécuter `supabase/migrations/20261029_super_admin_account_controls.sql` dans l’éditeur SQL Supabase.
2. Déployer les fonctions Edge `create-staff-account` et `manage-staff-account`.
3. Vérifier que les secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont configurés côté Edge Functions. La clé `SERVICE_ROLE` ne doit jamais être ajoutée au code du navigateur.
4. Se connecter avec le compte Super Admin actif et ouvrir **Administrateurs**.

Le blocage modifie le profil utilisé par les politiques RLS et bannit également l’utilisateur dans Supabase Auth. Le déblocage réactive le profil et retire le bannissement. Les comptes Super Admin sont protégés contre ces actions depuis cet écran.


### Isolation des comptes administrateurs (migration complémentaire)
Appliquer également `supabase/migrations/20261029_admin_workspace_isolation_audit.sql` après les migrations précédentes. Cette migration applique l'isolation au niveau PostgreSQL/RLS : chaque administrateur ne voit que les lignes qu'il a créées, tandis que le Super Admin voit tous les comptes et toutes les opérations. Elle active aussi le journal global d'activité réservé au Super Admin. Les données historiques sans `created_by` ne sont pas attribuées à un compte ordinaire.

### Verrouillage des fiches après enregistrement et série A.D.C.
Après les migrations précédentes, exécutez aussi `supabase/migrations/20261029_record_locking_and_adc.sql`. Les nouvelles fiches métier sont verrouillées automatiquement ; seul le Super Admin peut autoriser une correction temporaire. Une correction enregistrée par un administrateur reverrouille automatiquement la fiche. La fonction RPC `set_business_record_lock(p_table, p_id, p_locked)` est réservée au rôle `super_admin`. À ce stade, l'appel RPC est disponible mais les boutons de verrouillage individuel ne sont pas encore ajoutés dans chaque écran métier.
Le lycée comprend les niveaux `Première A.D.C.` et `Terminale A.D.C.`.

## Suivi des connexions et des sessions du personnel

Une migration supplémentaire est disponible : `supabase/migrations/20261030_staff_session_tracking.sql`.

Dans Supabase, exécuter cette migration après les migrations de base et d'audit déjà présentes. Elle crée `public.staff_sessions` avec les politiques RLS : le Super Admin peut consulter toutes les sessions, chaque membre du personnel peut uniquement créer et actualiser sa propre session. Le navigateur envoie un signal de présence toutes les 30 secondes. Le tableau Super Admin considère une session active si le dernier signal date de moins de 90 secondes. Une déconnexion normale enregistre l'heure de fin ; une fermeture brutale est détectée comme une absence de signal après le délai prévu.

En mode local de démonstration, les sessions sont conservées dans le stockage local du navigateur utilisé. Ce mode ne synchronise pas les sessions entre plusieurs appareils ou navigateurs ; pour un suivi centralisé entre utilisateurs, configurer Supabase et appliquer la migration.


### Mise à jour du 30 octobre 2026 — suivi du personnel et audit

Dans Supabase SQL Editor, exécutez séparément, dans cet ordre : `supabase/migrations/20261030_add_management_roles.sql`, puis `supabase/migrations/20261030_staff_attendance_and_audit_fix.sql`. Déployez ensuite les fonctions Edge `create-staff-account` et `manage-staff-account`. Le journal centralisé dépend de ces migrations et des triggers SQL ; le mode local reste limité au navigateur.

## Portail Parent — consultation par matricule
Le bouton « Accéder au portail parent » est disponible sur l'écran de connexion. Le parent saisit le matricule de l'élève et le numéro de téléphone du parent/tuteur enregistré lors de l'inscription. Le portail affiche l'identité scolaire, les notes, les présences/absences et les paiements validés.

Pour Supabase, exécutez `supabase/migrations/20261030_parent_portal_matricule.sql` dans l'éditeur SQL après `supabase/schema.sql`. La fonction contrôlée `parent_portal_lookup` effectue la vérification côté serveur et ne renvoie que le dossier correspondant. En mode aperçu local, la vérification est faite dans les données du navigateur.

**Sécurité avant mise en production :** le couple matricule + téléphone est une vérification simple, pas une authentification forte. Pour des données réelles de mineurs, activez une authentification parent (compte Supabase ou code OTP envoyé au numéro vérifié), ajoutez une limitation des tentatives et faites tester les politiques RLS. Ne considérez pas le portail comme prêt pour la production avant ces contrôles.

### Portail Parent : bulletins, relevés et matricules
Pour activer l'attribution centralisée des matricules sur Supabase, exécuter `supabase/migrations/20261030_student_matricule_sequence.sql`. Les bulletins par période et le relevé complet sont disponibles après vérification du matricule et du téléphone du parent. Voir `docs/BULLETINS-RELEVES-NOTES.md` pour le calcul des moyennes et les tests de déploiement.
