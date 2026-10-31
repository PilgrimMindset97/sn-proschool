# Décision automatique : admis / échoué

Dans le module **Notes et moyennes**, l'application recalcule la moyenne générale pondérée de chaque élève à partir des notes enregistrées. Chaque note est ramenée sur 20 (`note / barème × 20`) puis pondérée par son coefficient.

- Moyenne supérieure ou égale à **10/20** : **Admis**.
- Moyenne strictement inférieure à **10/20** : **Échoué**.
- Aucune note exploitable : **En attente** (aucune décision prématurée).

La décision est recalculée automatiquement après chaque saisie de note et affichée dans le tableau des moyennes. Elle apparaît aussi dans le rapport des moyennes et sur les bulletins/relevés imprimés. Le bulletin d'une période utilise uniquement les notes de cette période ; le relevé complet utilise toutes les notes disponibles.

**Important :** cette règle est la règle automatique demandée (seuil 10/20). Avant une décision officielle de passage de classe, l'établissement doit confirmer que le règlement scolaire ne prévoit pas de conditions supplémentaires (matières éliminatoires, délibération, rattrapage, etc.).
