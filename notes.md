# Notes de projet — HomeTransform

Journal de bord : état d'avancement, décisions prises et pourquoi, prochaines
étapes. Référencé depuis [`CLAUDE.md`](CLAUDE.md). Le détail fonctionnel
exhaustif reste dans [`documents/`](documents/) (avec statut par item) ; ce
fichier donne la vue synthétique et le contexte des décisions qui n'ont pas
forcément leur place dans un document de spec.

Dernière mise à jour : 2026-11-22 (soir).

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
  (iOS + Android), fil d'Ariane, **thème clair/sombre** (sombre par défaut,
  choix synchronisé par utilisateur — voir `documents/02-architecture.md`).
- **Non fait** : CI/CD (déploiement 100% manuel), justificatif de paiement
  (facture/devis attaché à un paiement — le modèle de données le permet,
  pas d'UI).
- **Corrigé le 2026-10-03** : fuite de confidentialité réelle en production —
  un objectif privé (+ ses tâches/rubriques) était visible par un autre
  membre de la famille via le tableau de bord. Cause : Firestore n'applique
  pas les règles de sécurité document par document sur une requête de liste
  (`onSnapshot(collection(...))` sans `where()`) quand la condition dépend
  d'un `get()` sur un autre document (ici l'objectif référencé) — confirmé
  via l'émulateur (JDK 21 en fait disponible sur ce poste, voir `CLAUDE.md`,
  la note "Non vérifié" précédente était fondée sur une fausse hypothèse
  d'environnement). Corrigé en dénormalisant `visibility` sur `Task` et
  `BudgetItem` (recopiée depuis l'objectif, "shared" par défaut) et en
  interrogeant Firestore via deux requêtes `where()` fusionnées côté client
  au lieu d'un `onSnapshot` sans filtre — voir `documents/02-architecture.md`
  section Sécurité pour le détail technique complet et les fichiers
  concernés. `npm run test:rules` passe (26 tests, dont 3 qui reproduisent
  explicitement la fuite sur une requête non contrainte pour documenter
  pourquoi ne jamais y revenir).
- **Thème clair/sombre livré le 2026-10-03** : demande du fils de
  l'utilisateur (trouvait le design "trop brut/épuré"), partie de pistes
  visuelles comparées sur un artifact (3 options, déclinées sur 4 écrans avec
  les vraies données de la famille) avant implémentation — l'utilisateur a
  choisi le mode sombre façon "tableau de bord de stade" (inspiré d'un autre
  projet GitHub, `wc2026`), avec le mode clair conservé comme option.
  Implémenté sur l'intégralité des écrans (pages + composants partagés) en
  une seule session — voir `documents/02-architecture.md` section Thème.
- **Pièces jointes étendues aux objectifs et aux rubriques budgétaires le
  2026-10-11** (jusqu'ici réservées aux tâches). Déclenché en préparant la
  mise à jour de l'objectif « Retaper la villa 24 » avec 2 devis fournisseurs
  comparés (comparatif Excel livré en dehors du dépôt — scratchpad de
  session, pas un fichier projet). La mise à jour Firestore proprement dite
  (rubriques retenues + devis en PJ) reste **à faire**, en attente du choix
  définitif de l'utilisateur dans l'onglet "Synthese decision" du comparatif.

## Décisions prises (et pourquoi)

- **Module Repas & Courses lancé le 2026-11-21** (brief :
  `documents/05-module-repas-courses.md`, stories : Epic 12). Module
  indépendant des objectifs/tâches/budgets (rythme hebdomadaire récurrent).
  Décisions de cadrage de l'utilisateur : la personne de ménage n'a **aucun
  accès** à l'app (envoi du programme/liste par WhatsApp, bilingue
  français/darija) ; quantités d'ingrédients **par variante** (2/3/4/5
  personnes ; par quantité pour un snack) et non par multiplication ;
  convives **par repas** ; dépenses séparées des budgets ; honoraires = un
  paiement daté ; retours repas en 👍/👎. **Étape 1 livrée en code** (pas
  encore déployée) : programme 7 j x 4 créneaux, liste de courses manuelle,
  envoi WhatsApp ; collections `mealPlans`/`shoppingLists` (un document par
  semaine, créneaux/articles en maps). Piège évité : les chemins de champ Firestore utilisent le point comme séparateur, donc pas
  de point dans une clé de champ (d’où les clés de créneau `mon_lunch`). Les
  libellés darija fixes (jours, repas) sont à faire relire par l'utilisateur.
  **Révisé le 2026-11-22 après lecture du cahier et de la liste réelle de la
  famille** : semaine du **samedi** (id de semaine = date du premier jour, pas ISO),
  3 colonnes (snacks/déjeuner/dîner), noms saisis en arabe ou français, courses
  **groupées par point de vente avec montant payé**. Le vrai besoin est d'éviter les
  **oublis** d'ingrédients (cha3ria oublié = plat non préparé) : priorité à un contrôle
  de couverture programme/liste plutôt qu'à une génération automatique complète.
  **Import et dépenses (2026-11-22)** : l'utilisateur n'ayant pas d'accès admin
  depuis une session Claude Code (voir plus haut), l'import des données réelles
  passe par l'app elle-même (collage de la liste WhatsApp et du programme,
  parseurs dans `src/domain/mealImport.ts`, testés sur la liste réelle). Modèle
  corrigé : **point de vente prévu (article) ≠ paiement réel** (collection
  `householdExpenses`, plusieurs paiements possibles chez le même point de vente),
  prix par article facultatif, honoraires 200 MAD/jour (sam/mar/jeu). Limite connue
  du parseur : un article commençant par « و » non suivi d'une quantité (ex.
  « وليشو ») garde le « و » — corrigeable à la main dans la liste.
  **Mode courses, snacks reportés, référentiel appris (2026-11-22)** : mode
  courses par point de vente (cocher, « Payer {point de vente} », avancement global) ;
  snacks d'un jour vide **calculés** depuis le dernier jour non vide (jamais copiés,
  pour ne compter qu'une fois leurs futurs ingrédients) ; collections `dishes` et
  `ingredients` alimentées automatiquement à chaque saisie/import (écritures « au
  mieux » : une panne du référentiel ne bloque pas la saisie). Précisions de
  l'utilisateur sur l'import : « و » = « et » (ôté en tête de ligne sauf devant
  ورق/ورد/وزن/وجبة/وسط/وقت), « حك » = boîte (ex. « حك ماييص » = 1 boîte de maïs),
  « ليشو » = un chou.
  Environnement : sur ce poste, `npx vitest` lancé depuis **Bash** échoue
  ("Cannot read properties of undefined (reading 'config')") alors qu'il
  passe depuis **PowerShell** — utiliser PowerShell pour les tests.

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
- **Mode sombre piloté par classe (`@custom-variant dark` sur `.dark`), pas
  par `prefers-color-scheme`** (le défaut Tailwind v4) : le thème est un choix
  explicite par utilisateur stocké sur son profil, pas un réglage système de
  l'appareil — les deux mécanismes peuvent diverger (ex. appareil en clair,
  utilisateur a choisi le sombre dans l'app).
- **Pièces jointes au niveau objectif ET rubrique budgétaire, pas seulement
  tâche** (2026-10-11) : question posée explicitement à l'utilisateur (une
  seule pièce jointe par devis au niveau objectif aurait suffi et évitait de
  dupliquer le même fichier sur chaque rubrique qu'il couvre) ; l'utilisateur
  a choisi de garder les deux granularités. Implémenté en généralisant
  `src/services/attachments.ts`/`AttachmentsSection.tsx` (déjà testés pour
  les tâches) plutôt qu'en dupliquant le code pour chaque type de parent.
- **Vue budget en tableau (type Excel)**, pas en cartes, dans le module
  Budget, la page objectif et la page tâche — bouton d'ajout systématiquement
  en haut de la liste. Les codes couleur de risque de dépassement (rouge/
  orange/vert) sont centralisés dans `src/constants.ts`
  (`BUDGET_ITEM_STATUS_*`) et réutilisés par la carte, le tableau et le
  dashboard.

## Prochaines étapes (proposées, non priorisées par l'utilisateur)

- Module Repas & Courses : déployer l'étape 1 (hosting + règles), puis étape 1b
  (import d'une liste WhatsApp, recopie de la liste), étape 2 (référentiel +
  glisser-déposer, à prototyper sur iPhone en PWA), étape 3 (contrôle de couverture).

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
