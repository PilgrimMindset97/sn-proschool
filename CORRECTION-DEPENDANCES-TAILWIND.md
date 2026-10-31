# Correction des dépendances PostCSS / Tailwind

Le projet déclare maintenant Tailwind CSS 3.4, PostCSS et Autoprefixer dans les dépendances de développement. Les configurations PostCSS et Tailwind sont fournies.

Après extraction du dossier, exécuter :

```bash
npm install
npm run dev
```

Si un ancien `node_modules` provoque encore une erreur sous Windows, fermer Vite puis exécuter `rmdir /s /q node_modules` et `del package-lock.json`, ensuite `npm install`.
