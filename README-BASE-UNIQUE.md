# SN ProSchool — base de données unique

## Choix technique
L'application utilise une seule base centrale : **Supabase (PostgreSQL)**. Les anciens scripts MySQL ne sont plus proposés comme deuxième base. Les modules élèves, parents, enseignants, classes, notes, bulletins, présences, finances, comptes, sessions et journal utilisent le même projet Supabase.

## Installation sur un nouveau projet Supabase
1. Créer un seul projet Supabase.
2. Ouvrir SQL Editor.
3. Copier le contenu de `supabase/INSTALLATION_UNIQUE_SUPABASE.sql` et l'exécuter.
4. Configurer `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env`.
5. Déployer les fonctions Edge présentes dans `supabase/functions/`.

## Important — données existantes
Ce regroupement unifie les **structures SQL** dans un seul script d'installation. Il ne transfère pas automatiquement les données déjà présentes dans plusieurs bases ou projets. Si tu as déjà des données réelles dans Supabase et/ou MySQL, il faut exporter ces données, faire une sauvegarde, puis réaliser une migration contrôlée avec correspondance des identifiants et vérification des doublons avant de supprimer une ancienne base. Ne lance pas l'installateur complet sur une base existante sans audit préalable.
