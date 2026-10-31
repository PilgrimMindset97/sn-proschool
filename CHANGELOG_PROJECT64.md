# Modifications project64 — 29 octobre 2026

## Inclus
- Inscription élève : photo, e-mail associé au dossier, statut actif/inactif.
- Filtre des élèves par statut; désactivation/activation affichée uniquement au Super Admin (ou dans l’aperçu local).
- Pointage des enseignants et responsables avec date, heure d’arrivée et statut.
- Référentiel pédagogique local/Supabase : enseignants, matières et classes.
- Reçu de paiement imprimable contenant uniquement le paiement choisi, sans budget général de l’école.
- Rapports imprimables pour les élèves, notes, moyennes, paiements, présences des élèves et du personnel.
- Espace Administrateurs et fonction Edge `create-staff-account`, vérifiant côté serveur que le demandeur est le Super Admin.
- Migration SQL additive pour les nouvelles colonnes et tables.

## À faire avant production
1. Sauvegarder la base Supabase.
2. Exécuter `supabase/migrations/20261029_project64_school_features.sql` après le schéma initial.
3. Déployer `supabase functions deploy create-staff-account`.
4. Vérifier le rôle `super_admin` du compte propriétaire et tester avec plusieurs comptes/rôles.
5. Installer les dépendances et lancer `npm run build` dans un environnement avec accès au registre npm.
6. Pour des photos nombreuses, remplacer le stockage image direct par Supabase Storage.
7. Le champ e-mail élève est enregistré dans son dossier; une authentification élève indépendante et un portail élève complet ne sont pas inclus dans cette version.

## Vérification effectuée
Le transpileur TypeScript a analysé la syntaxe des fichiers TSX/TS. Le build Vite complet n’a pas pu être lancé ici, car l’accès au registre npm a échoué avec `EAI_AGAIN`.

## Ajout du catalogue pédagogique (29 octobre 2026)
- Ajout d'un catalogue initial de matières pour chaque niveau de la petite section à la terminale.
- Ajout d'un affichage filtrable par cycle et par niveau dans le module Notes.
- Sélection des matières dans la saisie des notes selon la classe de l'élève, et sélection depuis le catalogue lors de l'affectation d'un enseignant.
- Les matières du lycée restent à ajuster selon la série et le programme officiel applicable; le catalogue est une base modifiable et non une certification du programme national.


### Contrôle des comptes du personnel par le Super Admin
- Liste des comptes du personnel avec e-mail, rôle et statut.
- Actions sécurisées côté serveur pour bloquer/débloquer les comptes et réinitialiser les mots de passe.
- Protection des comptes Super Admin dans cette interface et journalisation des actions sans conserver les mots de passe.
- Nouvelle migration SQL et fonction Edge `manage-staff-account`.


## Renforcement de la gestion Super Admin
- Chargement automatique de tous les profils du personnel à l’ouverture du module Administrateurs.
- Indicateurs du nombre total de comptes, actifs et bloqués.
- Recherche des comptes par nom, e-mail ou rôle.
- Blocage/déblocage appliqué à la fois au profil applicatif et à Supabase Auth.
- Ajout des étapes de déploiement dans le README.


## Isolation des espaces administrateurs et audit global
- Chaque ligne métier (élèves, notes, paiements, présences, enseignants et pointages du personnel) est attribuée automatiquement au compte qui la crée.
- Les administrateurs ne voient et ne modifient que leurs propres dossiers ; le Super Admin voit l'ensemble des dossiers.
- Le Super Admin dispose d'un journal global des actions effectuées par les administrateurs.
- Les journaux d'activité sont invisibles aux administrateurs ordinaires.
- Migration à appliquer : `supabase/migrations/20261029_admin_workspace_isolation_audit.sql`.
- Les anciennes lignes dont `created_by` est NULL restent réservées au Super Admin afin de ne pas les attribuer arbitrairement.

## Verrouillage des enregistrements et série A.D.C. (29/10/2026)
- Ajout du niveau Première A.D.C. et Terminale A.D.C. au cycle lycée et de leur référentiel pédagogique initial.
- Nouvelle migration `20261029_record_locking_and_adc.sql` : les fiches élèves, notes, paiements, présences, pointages et enseignants sont verrouillées dès leur insertion.
- Une modification par un compte non Super Admin est refusée tant que la fiche est verrouillée. Le Super Admin peut autoriser temporairement une correction via la fonction SQL `set_business_record_lock(table, id, false)` ; après l'enregistrement de la correction, la fiche est automatiquement reverrouillée. Il peut aussi verrouiller explicitement une fiche.
- La fonction SQL est protégée côté serveur par le rôle Super Admin et une liste blanche de tables.
- Limite actuelle : cette version fournit le mécanisme SQL sécurisé de déverrouillage/verrouillage ; les boutons de gestion individuelle de verrouillage ne sont pas encore intégrés dans chaque écran métier. L'opération de déverrouillage est donc à effectuer via l'appel RPC authentifié ou l'interface SQL autorisée, après vérification du rôle.

## Ajouts demandés — 30 octobre 2026
- Les niveaux du lycée sont désormais détaillés en huit séries : Seconde A/C, Première A/D/C et Terminale A/D/C.
- Ajout d'un schéma de départ pour une base unique MySQL `sn_proschool` (élèves, enseignants, parents, affectations, notes, paiements, présences, pointage, connexions et audit).
- Ajout de la configuration PDO exemple et d'un cahier de continuation pour la migration Supabase vers PHP/MySQL.
- La migration applicative complète reste à effectuer : `src/App.tsx` contient encore des appels Supabase.

## Correction demandée — création des comptes réservée au Super Admin
- La page de connexion conserve le formulaire de connexion et le bouton public « Créer un compte / Demander un accès » ; ce dernier soumet une demande, sans créer directement un compte.
- Le formulaire « Ajouter un compte » de l'espace Administrateurs du Super Admin exige maintenant un mot de passe provisoire (8 caractères minimum), en plus du nom, de l'e-mail et du rôle.
- En mode Supabase connecté, la fonction serveur `create-staff-account` crée le compte Auth et son profil actif. La personne peut ensuite se connecter avec l'e-mail et le mot de passe fournis par le Super Admin.
- En mode aperçu local, les ajouts restent des simulations : ils ne créent pas de véritables comptes de connexion.

## Correction — formulaire public de demande de compte
- Le bouton « Créer un compte / Demander un accès » est conservé sur la page de connexion.
- Le formulaire public recueille le nom complet, l'e-mail, le téléphone, le rôle demandé et les informations complémentaires.
- Les demandes sont affichées dans l'espace Administrateurs du Super Admin, dans une section distincte.
- Une demande publique ne crée pas automatiquement un compte actif et ne permet pas de choisir ses propres droits. Le Super Admin vérifie la demande, puis crée le compte et définit le mot de passe provisoire depuis son espace.
- En mode Supabase, la table `account_requests` doit être créée en exécutant la mise à jour ajoutée à `supabase/schema.sql`. Les demandes ne contiennent jamais de mot de passe.

## Workflow complet des demandes et créations de comptes — 30 octobre 2026
- Le bouton public « Créer un compte / Demander un accès » reste visible sur la page de connexion. Il ne crée qu'une demande en attente.
- Dans l'espace Super Admin, chaque demande affiche les coordonnées, le rôle demandé, le message et son état.
- Le bouton « Préparer le compte » préremplit le formulaire sécurisé d'ajout de compte avec les renseignements de la demande. Le Super Admin choisit le mot de passe provisoire (8 caractères minimum) et confirme la création.
- Après création Auth réussie, la demande correspondante passe à « Compte créé ». Le Super Admin peut aussi refuser une demande ; aucune de ces actions n'accorde de droits à la personne avant la création du compte par le Super Admin.
- La création réelle utilise la fonction Edge `create-staff-account`, qui vérifie côté serveur le rôle `super_admin` actif avant de créer l'utilisateur Auth et son profil.
- Migration autonome ajoutée : `supabase/migrations/20261030_account_requests.sql`. Elle crée la table et les règles RLS des demandes publiques.
- En mode aperçu local, les demandes et créations restent des simulations locales ; elles ne créent pas de véritables identifiants Auth. Le mode réel nécessite Supabase configuré, migration appliquée et fonction Edge déployée.

## 30 octobre 2026 — Suppression sécurisée des comptes du personnel
- Ajout de l'action « Supprimer » dans la liste des comptes, visible dans l'espace de gestion du Super Admin.
- Confirmation obligatoire en saisissant exactement l'adresse e-mail du compte ciblé.
- La suppression réelle passe par la fonction Edge `manage-staff-account` et Supabase Auth Admin ; le profil associé suit la règle de suppression référentielle configurée dans Supabase.
- Le compte Super Admin, le compte de l'utilisateur connecté et tout profil ayant le rôle `super_admin` sont protégés contre cette suppression depuis l'interface.
- L'action est inscrite dans `audit_logs` avant la suppression du compte.
- En mode aperçu local, la suppression est une simulation limitée à la liste locale et ne supprime aucun compte distant.
- Les comptes créés par le Super Admin se connectent depuis le formulaire normal avec leur e-mail et leur mot de passe provisoire ; l'accès reste conditionné à un profil actif.

## 30 octobre 2026 — Correction connexion des comptes Super Admin
- Démonstration locale : stockage persistant des comptes créés et vérification de mot de passe par PBKDF2-SHA-256 avec sel individuel.
- Connexion locale par e-mail + mot de passe pour tous les comptes locaux actifs créés par le Super Admin.
- Blocage, déblocage, réinitialisation du mot de passe et suppression locale synchronisés avec le magasin d'identifiants.
- Profils et journal local persistants après rechargement.
- Migration Supabase ajoutant les colonnes `profiles.email` et `profiles.created_by` utilisées par la fonction de création, et synchronisant les e-mails des profils existants.
- Note : les comptes locaux sont propres au navigateur ; les comptes Supabase sont partagés via Auth et ne sont pas interchangeables.

## 2026-10-30 — Bulletins et relevés dans Notes & moyennes et Rapports
- Ajout d'une sélection d'élève dans le module « Notes & moyennes » pour consulter les notes détaillées et imprimer le bulletin de chaque période ainsi que le relevé complet.
- Ajout de la même sélection et des actions d'impression individuelles dans « Rapports & impressions ».
- Les documents reprennent le nom, le matricule, le cycle, la classe, les notes, les barèmes, les coefficients, les périodes et la moyenne générale pondérée sur 20.
- Les documents utilisent les notes réellement présentes dans les données de l'application ; aucune note n'est inventée.
