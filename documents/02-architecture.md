# Architecture fonctionnelle et technique — HomeTransform

**Statut** : ✅ Fait · 🚧 Partiel · ⬜ Prévu. Mis à jour au 2026-09-28.

## Vue d'ensemble
```
[Navigateur] --SPA React statique--> Firebase Hosting
      |
      | SDK Firebase (JS, client-only)
      v
[Firebase — plan Spark, gratuit, sans carte bancaire]
 ├─ Auth        : connexion des membres de la famille (Google Sign-In)
 ├─ Firestore   : objectifs, tâches, budgetItems, commentaires, pièces jointes
 └─ Hosting     : sert le bundle React (dist/) + le service worker (public/sw.js)

[Navigateur] --POST /notify (à l'affectation)--> [Cloudflare Worker]
[Cloudflare Cron (07:00, quotidien)]            --> [Cloudflare Worker] --rappels d'échéance-->
                                                     Firestore (REST) + Web Push --> [Navigateur]
```
Le Worker Cloudflare (`hometransform-notifications`, dossier `worker/`) est un second
déployable, indépendant du SPA, pour les notifications push — voir *Notifications
push* ci-dessous.
Après une évaluation initiale de Cloudflare Pages pour l'hébergement du frontend,
tout a finalement été consolidé sur **Firebase** (Auth + Firestore + Hosting) : un
seul tableau de bord à gérer, un seul flux de déploiement (`firebase deploy`), pas
de risque de divergence entre l'origine de l'app et le domaine d'authentification
(`authDomain`) — ce qui avait justement causé plusieurs blocages de connexion durant
la mise en place. Les services utilisés restent gratuits sur le plan **Spark**, sans
carte bancaire.

**Pièces jointes** : deux pistes testées, toutes deux écartées parce qu'elles exigent
une carte bancaire même à usage gratuit — Firebase Storage (plan payant Blaze
obligatoire depuis fin 2024) puis Cloudflare R2 (carte demandée dès l'activation du
service sur le compte Cloudflare). La solution retenue reste donc **100% Firestore** :
chaque fichier est découpé côté client en morceaux encodés en base64 et stocké comme
plusieurs documents Firestore (voir *Modèle de données* ci-dessous), pour rester sous
la limite de 1 Mio par document. Pas de service ni de "backend" supplémentaire à
maintenir — tout reste sur Firebase.

## Décisions retenues
- **Authentification** : Google Sign-In (Firebase Auth, plan Spark).
- **Hébergement frontend** : Firebase Hosting (plan Spark), déployé via `firebase
  deploy --only hosting`.
- **Backend de données** : Firebase Firestore (plan Spark).
- **Fichiers** : stockés directement dans Firestore, découpés en morceaux (voir
  `src/domain/attachments.ts`) — pas de service de stockage de fichiers externe, pour
  rester 100% gratuit sans carte bancaire nulle part.

## Stack technique
- **Frontend** : React + TypeScript + Vite, Tailwind CSS, React Router.
- **Données temps réel** : SDK Firestore avec écouteurs (`onSnapshot`) — une modification
  par un membre est visible par les autres sans rafraîchissement manuel.
- **Fichiers** : découpage/réassemblage en base64 côté client (`src/domain/attachments.ts`,
  fonctions pures testées indépendamment), écriture/lecture des morceaux via des batchs
  Firestore (`writeBatch`) pour rester atomique et limiter le nombre d'aller-retours.
  Les photos (JPEG/PNG) sont redimensionnées côté client avant l'envoi si elles
  dépassent 1920 px sur leur plus grand côté (`src/services/imageResize.ts`, via
  `canvas`/`createImageBitmap`) — réduit nettement le nombre de morceaux nécessaires
  pour une photo de téléphone, sans effet sur les PDF.
- **Tests** : Vitest + React Testing Library (unitaire/composants), Firebase Emulator
  Suite (règles de sécurité Firestore).

## Configuration et secrets
La configuration client Firebase (`apiKey`, `authDomain`, `projectId`,
`messagingSenderId`, `appId`) n'est **pas codée en dur** dans le dépôt :
- Valeurs lues via des variables d'environnement Vite (`VITE_FIREBASE_API_KEY`,
  `VITE_FIREBASE_AUTH_DOMAIN`, etc.), injectées au build (`npm run build` lit
  `.env.local`).
- En local : fichier `.env.local` (gitignored), avec un `.env.example` versionné
  documentant les clés attendues.

Ces clés Firebase restent publiques par nature (elles sont visibles côté client de toute
façon, protégées par les règles de sécurité Firestore plutôt que par le secret), mais
les garder hors du dépôt facilite la rotation et garde le dépôt réutilisable sans fuite
de config d'environnement.

## Modèle de données (Firestore)
- `users/{uid}` : displayName, email, photoURL, colorTag (pour l'affichage dans le
  planning)
- `objectives/{id}` : title, description, targetDate, status, createdBy, createdAt
- `tasks/{id}` :
  - objectiveId (nullable — une tâche peut être libre, hors objectif)
  - title, description, room, type: `menage | travaux | achat | soustraitance`
  - priority, status: `todo | in_progress | blocked | done`
  - assigneeIds: string[]
  - dueDate
  - createdBy, createdAt, updatedAt
  - sous-collection `comments/{id}` : authorId, text, createdAt
  - sous-collection `attachments/{id}` : fileName, contentType, size, chunkCount,
    uploadedBy, uploadedAt
    - sous-sous-collection `chunks/{index}` : index, data (chaîne base64, ≤ ~700 Ko
      bruts par morceau, soit une dizaine de documents pour un fichier de 10 Mo)
- `budgetItems/{id}` : rubrique budgétaire (montant en MAD), liée à un objectif et/ou
  une tâche
  - title, category, objectiveId, taskId, vendor
  - budgeted, revisedBudget, committed (engagé)
  - remainingEstimate (reste à prévoir, ajustable manuellement) et forecastHistory
    (historique des révisions)
  - payments[] : { id, date, amount, comment, progress, status: `prevu | paye`,
    createdBy } — le réalisé se déduit toujours de la somme des paiements `paye`,
    jamais stocké directement
  - createdBy, createdAt, updatedAt

Pas de notion multi-foyer : l'app est dédiée à une seule famille (les données ne sont pas
cloisonnées par "household"), ce qui simplifie le modèle.

## Sécurité
- Firestore rules : accès en lecture/écriture réservé aux utilisateurs authentifiés
  dont l'email figure dans la collection `familymembers` — pas d'auto-inscription libre.
  Règle identique pour les sous-collections `attachments` et `attachments/{id}/chunks`,
  et pour `budgetItems`.
- Limite de taille (10 Mo) et de type de fichier (PDF/JPG/PNG) validées côté client
  avant le découpage (`src/domain/attachments.ts`). Pas de vérification serveur
  supplémentaire : l'app est privée (derrière Firebase Auth), pas exposée à des
  utilisateurs non authentifiés.
- Tout membre authentifié et autorisé peut créer/modifier/supprimer n'importe quel
  objectif/tâche/rubrique **partagé** — seule exception : un objectif `visibility:
  "private"` (et ses tâches/rubriques/commentaires/pièces jointes, qui héritent de
  cette visibilité) n'est lisible/modifiable que par son créateur.
- **Visibilité dénormalisée sur `Task.visibility`/`BudgetItem.visibility`** (recopiée
  depuis l'objectif référencé, "shared" si aucun) : nécessaire pour que les règles
  Firestore protègent aussi les requêtes de LISTE (`onSnapshot(collection(...))`),
  pas seulement les lectures document par document (`getDoc`). Sans ce champ propre
  au document, Firestore n'applique pas la règle document par document sur une
  requête de liste quand la condition dépend d'un `get()` sur un autre document (ici
  l'objectif) — un document qui aurait dû être refusé pouvait être renvoyé quand même.
  Bug réel observé en production (objectif privé visible par un autre membre de la
  famille via le tableau de bord), corrigé en dénormalisant `visibility` + en
  interrogeant Firestore avec deux requêtes `where()` fusionnées côté client
  (`where('visibility','==','shared')` + `where('createdBy','==',uid)`) au lieu d'un
  `onSnapshot` sans filtre. Voir `src/firebase/sharedOrOwnSubscription.ts`,
  `firebase-rules/firestore.rules` (fonction `visibilityOfObjectiveId`) et
  `firebase-rules/__tests__/firestore.rules.test.ts` pour la reproduction et la
  non-régression.

## Notifications push — ✅ Fait
Un Worker Cloudflare dédié (`worker/`, nommé `hometransform-notifications`) porte
l'envoi des notifications push, séparé du SPA :
- **Déclenchées par l'app** (`POST /notify`) : à l'affectation d'une tâche à un membre.
  Le Worker vérifie le token d'identité Firebase du membre qui affecte
  (`worker/src/auth.ts`), vérifie que son email est autorisé, puis envoie la
  notification Web Push (VAPID) aux abonnements du membre nouvellement assigné.
- **Planifiées** (cron Cloudflare, `0 7 * * *`, voir `worker/wrangler.jsonc`) : chaque
  jour, le Worker liste les tâches non terminées dont l'échéance est proche (fenêtre de
  2 jours) ou dépassée et n'ont pas encore été rappelées (`dueReminderSentAt`), envoie
  un push à leurs assignés, puis marque la tâche comme rappelée. Une nouvelle échéance
  (`updateTask` avec un `dueDate` modifié) réinitialise ce marqueur pour permettre un
  nouveau rappel.
- **Accès Firestore côté Worker** : pas d'Admin SDK (non disponible sur le runtime
  Cloudflare Workers). Le Worker utilise un compte de service Firebase (email + clé
  privée en secrets Wrangler) et signe lui-même une assertion JWT (flux
  *JWT-bearer*, RFC 7523, `worker/src/googleAuth.ts`) pour obtenir un token OAuth2 avec
  un accès complet à Firestore (équivalent Admin SDK), puis appelle l'API REST
  Firestore directement (`worker/src/firestoreClient.ts`). Ce token contourne les
  règles de sécurité côté client — normal et attendu pour un accès serveur de confiance,
  mais implique de garder le compte de service strictement secret (jamais dans le
  dépôt).
- Abonnement/désabonnement côté client : `src/services/push.ts`, stocké sur
  `users/{uid}.pushSubscriptions`.
- Coût : gratuit (plan Cloudflare Workers gratuit, web-push sans service tiers payant).

## Installation (PWA) — ✅ Fait
- `public/manifest.webmanifest` + icônes : rend l'app installable sur l'écran d'accueil
  (Android/Chrome via l'invite native `beforeinstallprompt`, iOS/Safari via
  Partager → Sur l'écran d'accueil, sans invite automatique — d'où les instructions
  dédiées dans `InstallPrompt.tsx`).
- `public/sw.js` : service worker minimal, uniquement pour recevoir/afficher les
  notifications push (`push`, `notificationclick`). Pas de cache applicatif : l'app a
  besoin d'une connexion à Firestore de toute façon, donc pas de mode hors-ligne.
- Cache HTTP (`firebase.json` → `hosting.headers`) : `index.html`, `sw.js` et
  `manifest.webmanifest` sont servis en `no-cache` (toujours revalidés), alors que les
  bundles `/assets/**` (nom haché par build) sont `immutable`. Sans ça, une PWA déjà
  installée pouvait continuer à servir l'ancien code plus d'une heure après un déploi.

## Hébergement & CI/CD
- **SPA** : déploiement manuel, `npm run build` puis `firebase deploy --only hosting`
  (et `--only firestore:rules` quand les règles changent). — ✅ Fait
- **Worker de notifications** : déploiement manuel séparé depuis `worker/`
  (`wrangler deploy`), secrets gérés via `wrangler secret put`. — ✅ Fait
- Le dépôt GitHub n'est pas encore relié à un déploiement continu pour l'un ou l'autre
  déployable (piste v2 : GitHub Actions). — ⬜ Prévu

## Documents du projet
Les artefacts de cadrage (brief, architecture, spec fonctionnelle, user stories) sont
versionnés en Markdown dans `documents/` :
- `01-product-brief.md`
- `02-architecture.md`
- `03-functional-spec.md`
- `04-user-stories.md`

## Tests par couche
- Unitaire (`domain/*`) : logique métier pure (calculs de budget par rubrique,
  agrégations d'avancement, découpage/réassemblage des pièces jointes en morceaux,
  rappels de tâches, filtres/tri). — ✅ Fait
- Composants (`components/`, `pages/`) : rendu et interactions (formulaires,
  listes filtrées, upload, tableau de bord). — ✅ Fait
- Worker de notifications (`worker/src/*.test.ts`) : auth, validation, client Firestore
  REST, logique de rappel — testés indépendamment du runtime Cloudflare. — ✅ Fait
- Intégration : règles de sécurité Firestore via l'émulateur (`npm run test:rules`,
  nécessite un JDK ≥ 21 en local ; vérifie qu'un email hors liste est bien rejeté, y
  compris sur les morceaux de pièces jointes et sur `budgetItems`). — ✅ Fait
- Suite complète au 2026-09-28 : 245 tests (Vitest, hors règles Firestore).
- E2E — ⬜ Prévu (optionnel v1) : parcours "créer tâche → affecter → uploader devis →
  clôturer".
