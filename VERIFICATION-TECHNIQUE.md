# Vérification technique — SN ProSchool

## Correction TypeScript / Vite

Le fichier `src/vite-env.d.ts` déclare les types de `import.meta.env` fournis par Vite et les deux variables d'environnement Supabase utilisées par l'application :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Cette déclaration corrige l'erreur TypeScript `Property 'env' does not exist on type 'ImportMeta'`, à condition que les types de Vite soient installés (via `npm install`).

## Vérification sur Windows

Dans le dossier du projet, exécuter :

```cmd
npm install
npm run build
```

Pour lancer le serveur de développement :

```cmd
npm run dev
```

La compilation complète doit être confirmée sur la machine de destination avec les dépendances installées. La correction de typage seule ne certifie pas la configuration Supabase ni les fonctionnalités métier.
