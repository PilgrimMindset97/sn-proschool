# SN ProSchool — installation avec une seule base de données

## Fichier SQL unique

Le fichier principal de la base est :

`BASE-DE-DONNEES-SN-PROSCHOOL.sql`

Une copie identique est disponible dans `supabase/INSTALLATION_UNIQUE_SUPABASE.sql` pour garder le dossier Supabase organisé.

## Installation dans Supabase

1. Créez ou ouvrez votre projet Supabase.
2. Ouvrez **SQL Editor** puis **New query**.
3. Ouvrez `BASE-DE-DONNEES-SN-PROSCHOOL.sql` depuis ce projet.
4. Copiez tout son contenu dans l'éditeur SQL et cliquez sur **Run**.
5. Vérifiez le résultat dans **Table Editor**.

**Important :** sur une base neuve, exécutez ce fichier principal une seule fois. Ne lancez pas ensuite chaque fichier de `supabase/migrations/` : ces fichiers sont conservés comme historique des évolutions et ne sont pas une deuxième installation à effectuer.

Le script ne transfère pas automatiquement les données d'une ancienne base. Faites une sauvegarde avant toute opération sur une base qui contient déjà des données.

## Configurer l'application

1. Copiez `.env.example` vers `.env`.
2. Renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` avec les valeurs du projet Supabase.
3. N'ajoutez jamais la clé `service_role` dans le code frontend ni dans `.env` exposé au navigateur.
4. Dans un terminal à la racine du projet, exécutez :

```bash
npm install
npm run dev
```

## Compte Super Administrateur

Le script SQL comprend un bloc final facultatif pour attribuer le rôle Super Administrateur à l'adresse configurée dans le script. Créez d'abord ce compte dans **Supabase > Authentication > Users**. Si le compte n'existe pas au moment de l'installation, le script affiche une notification ; après sa création, réexécutez uniquement le bloc final indiqué dans le SQL, pas tout le fichier.

## Architecture

L'application utilise un seul projet Supabase/PostgreSQL central, organisé en tables reliées entre elles. Il ne s'agit pas d'un fichier de base SQLite local : le fichier SQL sert à installer le schéma dans Supabase.
