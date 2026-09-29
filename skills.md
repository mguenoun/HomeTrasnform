# skills.md — Procédure de correction/évolution — HomeTransform

Suite de [`CLAUDE.md`](CLAUDE.md) (commandes, pièges) et [`notes.md`](notes.md)
(état, décisions, prochaines étapes). Ce fichier décrit **comment dérouler**
une correction ou une évolution sur ce dépôt, de bout en bout.

## Procédure

### 1. Cadrer

- Relire `notes.md` (état d'avancement, décisions déjà prises) pour ne pas
  recontredire une décision existante sans le savoir.
- Si le changement touche un modèle de données, des règles de sécurité
  Firestore, ou a plusieurs façons raisonnables d'être fait : proposer une
  conception courte et valider les points ambigus avant d'écrire du code
  (question ciblée plutôt qu'un aller-retour après coup). Les changements de
  règles de sécurité sont particulièrement sensibles : une erreur peut soit
  exposer des données privées, soit verrouiller toute la famille hors de
  l'app — mesurer avant d'agir.
- Pour une évolution large, la découper en étapes indépendamment
  déployables (voir `notes.md` pour l'exemple du passage au budget par
  rubriques, fait en 4 commits/déploiements successifs).

### 2. Implémenter

- Code + tests dans le même mouvement, pas après coup.
- Toute nouvelle dépendance à un hook Firebase dans une page existante =
  vérifier immédiatement les fichiers de test de cette page (voir le piège
  correspondant dans `CLAUDE.md`).
- Toute nouvelle règle Firestore = préférer les accesseurs sûrs
  (`.get(cle, defaut)`) pour tout champ qui pourrait être absent sur un
  document plus ancien.

### 3. Vérifier

Dans cet ordre, à chaque étape déployable (pas seulement à la fin) :

```bash
npx tsc -b                          # ou npm run build
npx vitest run src/.../fichier.test.ts   # le(s) fichier(s) concerné(s) d'abord
npx vitest run                       # suite complète
npx oxlint src/                       # lint
```

Pour un changement de règles Firestore, ajouter/mettre à jour
`firebase-rules/__tests__/firestore.rules.test.ts`, puis :

```bash
npm run test:rules                    # si un JDK 21 est disponible localement
npx firebase deploy --only firestore:rules --dry-run   # sinon, valide au moins la syntaxe
```

Si `test:rules` n'est pas exécutable (JDK manquant, cas de cet
environnement), le dire explicitement dans le rapport final plutôt que de
laisser croire que c'est vérifié — voir `CLAUDE.md`.

### 4. Mettre à jour la documentation projet

Systématique dès que le comportement de l'app change, pas seulement à la
demande :

- `documents/03-functional-spec.md` — description de l'écran/parcours
  concerné, avec son statut (✅ Fait / 🚧 Partiel / ⬜ Prévu).
- `documents/02-architecture.md` — si la décision technique change (nouveau
  service, nouvelle collection Firestore, nouveau mécanisme de sécurité,
  etc.) ; tenir à jour la section *Modèle de données* et la table de statut.
- `documents/04-user-stories.md` — ajouter/mettre à jour la story concernée
  avec son statut ; si la fonctionnalité n'a pas de story existante (ajoutée
  hors plan initial), en créer une plutôt que de laisser le doc
  incomplet.
- `documents/01-product-brief.md` — seulement pour une évolution notable du
  périmètre (ex. changement de modèle de données central, capacité qui
  change la proposition de valeur) ; ajouter une note "Dernière évolution"
  datée en tête de fichier plutôt que de réécrire tout le brief.
- `notes.md` — mettre à jour *État d'avancement*, ajouter la décision prise
  (et le pourquoi) si elle n'est pas déjà évidente depuis les docs
  fonctionnels, et ajuster *Prochaines étapes*.

Commit de doc séparé du commit de code quand la doc est mise à jour après
coup (pas mélangé).

### 5. Livrer

```bash
git add <fichiers ciblés>            # jamais git add -A sans relire git status
git commit -m "..."                    # français, le pourquoi, ligne d'attribution
git push origin master
npm run build
npx firebase deploy --only hosting
npx firebase deploy --only firestore:rules   # seulement si les règles ont changé
```

Si `worker/` a été modifié : le signaler comme **non déployé** dans le
rapport final (voir *Permissions* ci-dessous — jamais exercé depuis une
session Claude Code sur ce projet), sauf si l'utilisateur confirme vouloir
que ça soit fait et que l'accès Cloudflare est vérifié à ce moment-là.

### 6. Rapporter

Résumer : ce qui a changé, ce qui a été vérifié (tests/typecheck/lint) et
comment, ce qui n'a **pas** pu être vérifié et pourquoi (ex. règles Firestore
sans émulateur), ce qui reste à faire. Ne jamais présenter une règle de
sécurité comme "testée" si seule la syntaxe a été validée.

## Permissions déjà accordées dans les sessions passées

État constaté, pas une garantie permanente — à reconfirmer si une commande
échoue de façon inattendue (session expirée, droits changés, etc.).

- **GitHub** — accès en écriture confirmé et exercé à plusieurs reprises :
  `git push origin master` sur `https://github.com/mguenoun/HomeTrasnform.git`
  fonctionne sans prompt d'authentification. Push direct sur `master`, aucun
  flux de pull request utilisé à ce jour. Aucune action destructrice
  (force-push, suppression de branche) n'a été nécessaire ni tentée.
- **Google Firebase / Firestore** — accès confirmé et exercé :
  le CLI `firebase` est déjà authentifié (`firebase login`) en tant que
  `mguenoun@gmail.com`, avec accès au projet `hometransform-c2ac9`
  (confirmé via `npx firebase login:list`). Fonctionne sans prompt :
  `firebase deploy --only hosting`, `firebase deploy --only firestore:rules`
  (et `--dry-run`). **Ne couvre pas** l'émulateur Firestore local
  (`firebase emulators:exec`, utilisé par `npm run test:rules`), qui
  échoue dans cet environnement faute de JDK 21 — ce n'est pas un problème
  de permission mais d'environnement (voir `CLAUDE.md`).
- **`gcloud`** — authentifié sur cette machine, mais pour un **autre**
  projet/compte de l'utilisateur (constaté via `gcloud auth list` /
  `gcloud config get-value project` : compte et projet différents de
  HomeTransform). À ne jamais utiliser pour ce dépôt, et surtout ne jamais
  reconfigurer (`gcloud config set ...`) — ça casserait l'usage de
  `gcloud` pour l'autre projet de l'utilisateur.
- **Extraction d'identifiants stockés** (tokens OAuth locaux de
  `firebase-tools`, credentials par défaut `gcloud`, clé de compte de
  service) — tentative bloquée explicitement par un classificateur de
  sécurité lors d'une session passée (recherche du fichier de configstore
  de `firebase-tools` pour obtenir un accès Firestore "admin" sans passer
  par les règles). Comportement voulu, pas une limitation à contourner —
  ne pas retenter, même sous un autre angle (autre outil, autre encodage).
  Voir `CLAUDE.md`.
- **Cloudflare / Worker de notifications** — **non exercé** à ce jour.
  Aucune commande `wrangler` (`dev`, `deploy`, `secret put`) n'a été lancée
  depuis une session Claude Code sur ce projet. Le Worker
  (`hometransform-notifications`) et son mécanisme d'authentification par
  compte de service sont documentés dans `documents/02-architecture.md`
  d'après lecture du code, mais l'accès de déploiement réel (identifiants
  Cloudflare, `wrangler login`) n'a jamais été testé. Avant de promettre un
  déploiement du Worker, vérifier d'abord que `npx wrangler whoami` (ou
  équivalent) répond sans erreur, et le signaler clairement si ce n'est pas
  le cas plutôt que de supposer que ça fonctionne comme pour Firebase.
