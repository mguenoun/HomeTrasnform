# Notes de projet — HomeTransform

Journal de bord : état d'avancement, décisions prises et pourquoi, prochaines
étapes. Référencé depuis [`CLAUDE.md`](CLAUDE.md). Le détail fonctionnel
exhaustif reste dans [`documents/`](documents/) (avec statut par item) ; ce
fichier donne la vue synthétique et le contexte des décisions qui n'ont pas
forcément leur place dans un document de spec.

Dernière mise à jour : 2026-09-29.

## État d'avancement

Quasi tout le périmètre fonctionnel prévu est livré et déployé sur
`hometransform-c2ac9.web.app`. Voir `documents/04-user-stories.md` pour le
détail épique par épique ; en résumé :

- **Fait** : auth Google (avec allowlist `familymembers`), objectifs
  (CRUD, archivage, **privé/partagé**), tâches (CRUD, statuts, affectation),
  budget par rubriques (`budgetItems` — budget/engagé/réalisé/prévision,
  paiements datés, vue liste type tableur), pièces jointes, commentaires,
  tableau de bord (KPI globaux, par personne, rubriques à surveiller, figures
  budgétaires sur les cartes objectif/tâche), notifications push
  (affectation + rappel d'échéance quotidien), installation PWA
  (iOS + Android), fil d'Ariane.
- **Non fait** : CI/CD (déploiement 100% manuel), justificatif de paiement
  (facture/devis attaché à un paiement — le modèle de données le permet,
  pas d'UI).
- **Non vérifié** : les nouvelles règles Firestore (objectifs privés) n'ont
  pas pu être testées via l'émulateur dans cet environnement (pas de JDK 21,
  voir `CLAUDE.md`) — validées seulement par compilation (`--dry-run`) et
  relecture manuelle scénario par scénario. À confirmer avec
  `npm run test:rules` sur un poste équipé.

## Décisions prises (et pourquoi)

- **Budget = rubriques indépendantes des tâches**, pas des champs sur la
  tâche. Permet une chaîne budget → engagé → réalisé → prévision → écart,
  une rubrique pouvant être liée à un objectif et/ou une tâche (ou aucun des
  deux). Le réalisé n'est jamais stocké : toujours recalculé comme la somme
  des paiements au statut `paye`, pour éviter toute désynchronisation.
- **Devise unique : MAD** (dirham marocain) — pas de multi-devise.
- **Vie privée d'un objectif appliquée par les règles Firestore, pas par un
  filtre client** : un objectif `visibility: "private"` (et ses tâches,
  rubriques, commentaires, pièces jointes) est réellement invisible côté
  serveur pour qui n'en est pas le créateur, pas juste masqué à l'affichage.
  Conséquence directe et volontaire : les KPI (dashboard, par personne,
  budget) reflètent automatiquement ce périmètre sans code spécifique,
  puisqu'ils ne calculent qu'à partir de ce que Firestore a effectivement
  transmis au client.
- **Assignation restreinte au créateur sur une tâche liée à un objectif
  privé** (décision utilisateur explicite, pas un choix par défaut) : plutôt
  que de laisser assigner quelqu'un qui ne pourra techniquement pas voir la
  tâche.
- **`signInWithRedirect` plutôt que `signInWithPopup`** : évite l'alerte de
  sécurité Google déclenchée par le popup en contexte PWA installée.
- **Pas de script de migration** à chaque évolution de modèle de données
  (retrait des champs budget de `Task`, ajout de `Objective.visibility`) :
  vérifié à chaque fois qu'il n'y avait pas de données réelles concernées
  (2 objectifs, ~1 tâche, aucun budget en prod au moment des changements).
  Toujours reconfirmer avec l'utilisateur avant de supposer qu'un champ
  optionnel avec valeur par défaut suffit — ne pas juste l'assumer.
- **Champs Firestore optionnels lus avec `.get(cle, defaut)` dans les
  règles**, jamais par accès point direct, dès qu'un document plus ancien
  pourrait ne pas avoir le champ (ex. `visibility`). Voir `CLAUDE.md`.
- **Vue budget en tableau (type Excel)**, pas en cartes, dans le module
  Budget, la page objectif et la page tâche — bouton d'ajout systématiquement
  en haut de la liste. Les codes couleur de risque de dépassement (rouge/
  orange/vert) sont centralisés dans `src/constants.ts`
  (`BUDGET_ITEM_STATUS_*`) et réutilisés par la carte, le tableau et le
  dashboard.

## Prochaines étapes (proposées, non priorisées par l'utilisateur)

- Faire vérifier les règles Firestore des objectifs privés avec
  `npm run test:rules` sur un poste avec JDK 21 (voir `CLAUDE.md`).
- CI/CD : automatiser au moins `npm run build && npm run test && npm run lint`
  sur push (GitHub Actions), le déploiement peut rester manuel dans un
  premier temps.
- Justificatif de paiement (upload sur un `BudgetPayment`), en réutilisant le
  mécanisme de pièces jointes déjà en place pour les tâches.
- Vérifier/exercer un déploiement réel du Worker Cloudflare
  (`worker/`, `wrangler deploy`) — jamais fait depuis une session Claude Code
  sur ce projet à ce jour.
- Le bundle JS de prod dépasse 500 Ko (avertissement Vite au build) —
  envisager du code-splitting (`dynamic import()`) si ça devient sensible,
  pas urgent pour l'usage actuel (famille, quelques utilisateurs).
