# Architecture fonctionnelle et technique — HomeTransform

## Vue d'ensemble
```
[Navigateur] --SPA React statique--> Firebase Hosting
      |
      | SDK Firebase (JS, client-only)
      v
[Firebase — plan Spark, gratuit, sans carte bancaire]
 ├─ Auth        : connexion des membres de la famille (Google Sign-In)
 ├─ Firestore   : objectifs, tâches, commentaires, métadonnées des pièces jointes
 └─ Hosting     : sert le bundle React (dist/)

      |
      | fetch() avec le token Firebase (Authorization: Bearer ...)
      v
[Cloudflare Worker "attachments"] --vérifie le token + l'email--> [Cloudflare R2]
                                                                    fichiers (devis/
                                                                    factures/photos)
```
Après une évaluation initiale de Cloudflare Pages pour l'hébergement du frontend,
tout a finalement été consolidé sur **Firebase** (Auth + Firestore + Hosting) : un
seul tableau de bord à gérer, un seul flux de déploiement (`firebase deploy`), pas
de risque de divergence entre l'origine de l'app et le domaine d'authentification
(`authDomain`) — ce qui avait justement causé plusieurs blocages de connexion durant
la mise en place. Les trois services utilisés restent gratuits sur le plan **Spark**,
sans carte bancaire.

Les fichiers (pièces jointes) restent stockés sur **Cloudflare R2** plutôt que
Firebase Storage : depuis fin 2024, Firebase Storage impose le plan payant Blaze pour
être activé, même à usage gratuit. Pour ne pas avoir à lier de carte bancaire au
projet Firebase, on héberge les fichiers sur R2 (gratuit jusqu'à 10 Go, pas de carte
requise) via un unique petit Cloudflare Worker qui fait office de porte d'entrée
sécurisée (vérifie que l'appelant est un membre de la famille avant de lire/écrire un
fichier). C'est le seul bout de "backend" du projet — tout le reste reste sans
serveur à maintenir.

## Décisions retenues
- **Authentification** : Google Sign-In (Firebase Auth, plan Spark).
- **Hébergement frontend** : Firebase Hosting (plan Spark), déployé via `firebase
  deploy --only hosting`.
- **Backend de données** : Firebase Firestore (plan Spark).
- **Fichiers** : Cloudflare R2, via un Cloudflare Worker qui vérifie l'authentification
  Firebase avant chaque accès (au lieu de Firebase Storage, pour rester 100% gratuit
  sans carte bancaire).

## Stack technique
- **Frontend** : React + TypeScript + Vite, Tailwind CSS, React Router.
- **Données temps réel** : SDK Firestore avec écouteurs (`onSnapshot`) — une modification
  par un membre est visible par les autres sans rafraîchissement manuel.
- **Fichiers** : Cloudflare Worker (TypeScript, `worker/`) exposant 3 routes
  (upload / téléchargement / suppression) sur un bucket R2, appelées par le client via
  `fetch()` avec le token d'ID Firebase en en-tête `Authorization`. Le Worker vérifie la
  signature du token (JWKS Firebase, librairie `jose`) et que l'email correspond à un
  membre autorisé, avant de lire/écrire dans R2.
- **Tests** : Vitest + React Testing Library (unitaire/composants), Firebase Emulator
  Suite (règles de sécurité Firestore), tests du Worker via `vitest` + `@cloudflare/vitest-pool-workers`,
  Playwright en option pour l'E2E critique.

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
  - budgetEstimated, budgetActual, currency
  - createdBy, createdAt, updatedAt
  - sous-collection `comments/{id}` : authorId, text, createdAt
  - sous-collection `attachments/{id}` : fileName, storagePath (clé R2), contentType,
    size, uploadedBy, uploadedAt
- Fichiers réels dans le bucket R2 sous `tasks/{taskId}/{attachmentId}-{fileName}`,
  gérés exclusivement via le Worker (jamais d'accès direct du client à R2)

Pas de notion multi-foyer : l'app est dédiée à une seule famille (les données ne sont pas
cloisonnées par "household"), ce qui simplifie le modèle.

## Sécurité
- Firestore rules : accès en lecture/écriture réservé aux utilisateurs authentifiés
  dont l'email figure dans la collection `familymembers` — pas d'auto-inscription libre.
- Worker (fichiers) : chaque requête doit porter un token d'ID Firebase valide
  (signature vérifiée via le JWKS public de Firebase) dont l'email figure dans la
  liste des membres autorisés, configurée comme variable du Worker (`ALLOWED_EMAILS`).
  Cette liste duplique volontairement `familymembers` (Firestore) — ajouter un membre
  nécessite de le déclarer aux deux endroits. Limite de taille/type de fichier (10 Mo
  max, PDF/JPG/PNG) appliquée dans le Worker avant l'écriture dans R2.
- Tout membre authentifié et autorisé peut créer/modifier/supprimer n'importe quelle
  tâche, objectif, commentaire ou pièce jointe (pas de granularité de droits en v1).

## Hébergement & CI/CD
- Déploiement manuel pour l'instant : `npm run build` puis `firebase deploy --only
  hosting` (et `--only firestore:rules` quand les règles changent). Le dépôt GitHub
  n'est pas encore relié à un déploiement continu (piste v2 : GitHub Actions avec un
  compte de service Firebase en secret du repo).
- Le Worker (`worker/`) et le bucket R2 sont déployés séparément via `wrangler deploy`
  (pas de déploiement continu automatique en v1 — le Worker change rarement une fois
  en place).

## Documents du projet
Les artefacts de cadrage (brief, architecture, spec fonctionnelle, user stories) sont
versionnés en Markdown dans `documents/` :
- `01-product-brief.md`
- `02-architecture.md`
- `03-functional-spec.md`
- `04-user-stories.md`

## Tests prévus par couche
- Unitaire : logique métier pure (calculs de budget, agrégations d'avancement).
- Composants : rendu et interactions (formulaires tâche, liste filtrée, upload).
- Intégration : règles de sécurité Firestore via l'émulateur (vérifier qu'un email hors
  liste est bien rejeté, etc.) ; règles du Worker testées directement (token absent/
  invalide, email non autorisé, fichier trop lourd ou de mauvais type → rejet).
- E2E (optionnel v1) : parcours "créer tâche → affecter → uploader devis → clôturer".
