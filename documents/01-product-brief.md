# Product Brief — HomeTransform

## Vision
Une application web unique où la famille pilote tout ce qui touche à la maison : du grand
ménage ponctuel aux gros travaux (peinture, création de baies/portes-fenêtres, achats
d'équipement). Un seul endroit pour lister les tâches, les affecter, suivre leur budget et
leur avancement jusqu'à l'objectif final (ex: "salon rénové", "maison rangée avant l'été").

## Problème à résoudre
Aujourd'hui ces tâches sont dispersées (notes, messages, mémoire) : pas de vision
d'ensemble, pas de suivi de budget, pas de visibilité sur qui fait quoi et où ça en est.
Les gros travaux et les petites corvées ne sont jamais mis en relation avec un objectif
global.

## Utilisateurs cibles
- Membres de la famille (2-6 personnes) : consultent, créent, s'affectent des tâches,
  mettent à jour l'avancement.
- Un seul rôle en v1 : tous les membres ont les mêmes droits (pas d'admin/enfant distinct).

## Périmètre fonctionnel (v1)
1. **Objectifs** : regroupements de haut niveau (ex: "Réaménager le rez-de-chaussée")
   auxquels sont rattachées des tâches.
2. **Tâches/travaux**, avec :
   - Type : ménage léger / travaux lourds / achat / sous-traitance
   - Description, pièce concernée, priorité
   - Budget estimé vs réel (si achat ou sous-traitance)
   - Statut (à faire / en cours / bloqué / terminé)
   - Affectation à un ou plusieurs membres
   - Échéance / date souhaitée
   - Historique/commentaires
   - **Pièces jointes** (devis, factures, photos)
3. **Budget global** : somme des budgets par tâche, par objectif, et vue d'ensemble
   (engagé vs dépensé).
4. **Suivi d'avancement** : tableau de bord (par objectif, par statut, par personne),
   % de complétion.
5. **Partage familial** : plusieurs personnes voient et modifient les mêmes données en
   temps réel.

## Hors périmètre v1
- Pas de gestion de devis/factures scannées automatiquement (juste upload manuel de
  fichiers + montants saisis à la main).
- Pas de notifications push/email (v2 potentielle).
- Pas de gestion fine des droits par utilisateur (v2 si besoin).
- Pas d'appli mobile native (web responsive uniquement).
- Pas de mode offline.

## Critères de succès
- Toute la famille peut ouvrir un lien et voir/modifier les tâches sans installation.
- On peut répondre en un coup d'œil à : "combien reste-t-il à dépenser pour finir le
  salon ?", "qui doit faire quoi cette semaine ?", "où en est-on sur l'objectif X ?".
- Coût d'hébergement = 0€.
