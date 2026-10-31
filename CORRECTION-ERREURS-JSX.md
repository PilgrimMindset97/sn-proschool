# Correction des erreurs JSX

Cette version corrige deux fermetures JSX dans `src/App.tsx` :

- Le bloc conditionnel `module === 'notes'` ouvrait un fragment `<>` mais ne le fermait pas avec `</>`.
- Le bloc conditionnel `module === 'presences'` ouvrait directement un `<div>` mais se terminait par une fermeture de fragment `</>` en trop.

Les fermetures ont été harmonisées. Les fonctionnalités et les données du projet ont été conservées.

## Vérification

Le contrôle d'intégrité de l'archive ZIP a été effectué. La compilation `npm run build` n'a pas pu être exécutée dans cet environnement, car l'installation des dépendances a expiré. Après extraction, exécuter `npm install`, puis `npm run build` et `npm run dev`.
