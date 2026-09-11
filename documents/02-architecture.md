# Architecture fonctionnelle et technique — HomeTransform

## Vue d'ensemble
```
[Navigateur] --SPA React statique--> Cloudflare Pages
      |
      | SDK Firebase (JS, client-only, pas de serveur à nous)
      v
[Firebase]
 ├─ Auth        : connexion des membres de la famille (Google Sign-In)
 ├─ Firestore   : objectifs, tâches, commentaires, métadonnées des pièces jointes
 └─ Storage     : fichiers (devis/factures/photos)
```
Aucun backend à héberger nous-même : le frontend est 100% statique (déployé sur
Cloudflare Pages), toute la logique "serveur" (auth, données partagées temps réel,
fichiers) est déléguée à Firebase, gratuit à ce volume d'usage (plan Spark).

## Décisions retenues
- **Authentification** : Google Sign-In (Firebase Auth).
- **Hébergement** : Cloudflare Pages, déploiement continu depuis le repo Git.
- **Backend de données** : Firebase (Firestore + Storage).

## Stack technique
- **Frontend** : React + TypeScript + Vite, Tailwind CSS, React Router.
- **Données temps réel** : SDK Firestore avec écouteurs (`onSnapshot`) — une modification
  par un membre est visible par les autres sans rafraîchissement manuel.
- **Fichiers** : Firebase Storage, upload direct depuis le client.
- **Tests** : Vitest + React Testing Library (unitaire/composants), Firebase Emulator
  Suite (règles de sécurité Firestore/Storage), Playwright en option pour l'E2E critique.

## Configuration et secrets
La configuration client Firebase (`apiKey`, `authDomain`, `projectId`, `storageBucket`,
`messagingSenderId`, `appId`) n'est **pas codée en dur** dans le dépôt :
- Valeurs lues via des variables d'environnement Vite (`VITE_FIREBASE_API_KEY`,
  `VITE_FIREBASE_AUTH_DOMAIN`, etc.), injectées au build.
- En local : fichier `.env.local` (gitignored), avec un `.env.example` versionné
  documentant les clés attendues.
- En production/preview : variables d'environnement définies dans le projet Cloudflare
  Pages (Settings → Environment variables), pas commitées dans le dépôt.

Ces clés Firebase restent publiques par nature (elles sont visibles côté client de toute
façon), mais les garder hors du dépôt et gérées via Cloudflare évite de les coupler au
code source, facilite la rotation et garde le dépôt réutilisable sans fuite de config
d'environnement.

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
  - sous-collection `attachments/{id}` : fileName, storagePath, url, contentType, size,
    uploadedBy, uploadedAt
- Fichiers réels dans Storage sous `tasks/{taskId}/{attachmentId}-{fileName}`

Pas de notion multi-foyer : l'app est dédiée à une seule famille (les données ne sont pas
cloisonnées par "household"), ce qui simplifie le modèle.

## Sécurité
- Firestore/Storage rules : accès en lecture/écriture réservé aux utilisateurs
  authentifiés dont l'email figure dans une liste de membres autorisés (collection
  `familyMembers` ou liste codée dans les règles) — pas d'auto-inscription libre.
- Limite de taille/type de fichier appliquée dans les règles Storage (10 Mo max,
  PDF/images uniquement).
- Tout membre authentifié et autorisé peut créer/modifier/supprimer n'importe quelle
  tâche, objectif, commentaire ou pièce jointe (pas de granularité de droits en v1).

## Hébergement & CI/CD
- Repo Git → push sur `main` → build Vite → déploiement automatique via l'intégration
  Cloudflare Pages (build command + variables d'environnement configurées dans le
  dashboard Cloudflare).
- Preview deployments automatiques sur les pull requests.

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
- Intégration : règles de sécurité Firestore/Storage via l'émulateur (vérifier qu'un
  email hors liste est bien rejeté, qu'un fichier trop lourd est refusé, etc.).
- E2E (optionnel v1) : parcours "créer tâche → affecter → uploader devis → clôturer".
