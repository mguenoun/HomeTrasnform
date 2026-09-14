# Architecture fonctionnelle et technique — HomeTransform

## Vue d'ensemble
```
[Navigateur] --SPA React statique--> Firebase Hosting
      |
      | SDK Firebase (JS, client-only)
      v
[Firebase — plan Spark, gratuit, sans carte bancaire]
 ├─ Auth        : connexion des membres de la famille (Google Sign-In)
 ├─ Firestore   : objectifs, tâches, commentaires, pièces jointes (voir ci-dessous)
 └─ Hosting     : sert le bundle React (dist/)
```
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
  - budgetEstimated, budgetActual, currency
  - createdBy, createdAt, updatedAt
  - sous-collection `comments/{id}` : authorId, text, createdAt
  - sous-collection `attachments/{id}` : fileName, contentType, size, chunkCount,
    uploadedBy, uploadedAt
    - sous-sous-collection `chunks/{index}` : index, data (chaîne base64, ≤ ~700 Ko
      bruts par morceau, soit une dizaine de documents pour un fichier de 10 Mo)

Pas de notion multi-foyer : l'app est dédiée à une seule famille (les données ne sont pas
cloisonnées par "household"), ce qui simplifie le modèle.

## Sécurité
- Firestore rules : accès en lecture/écriture réservé aux utilisateurs authentifiés
  dont l'email figure dans la collection `familymembers` — pas d'auto-inscription libre.
  Règle identique pour les sous-collections `attachments` et `attachments/{id}/chunks`.
- Limite de taille (10 Mo) et de type de fichier (PDF/JPG/PNG) validées côté client
  avant le découpage (`src/domain/attachments.ts`). Pas de vérification serveur
  supplémentaire : l'app est privée (derrière Firebase Auth), pas exposée à des
  utilisateurs non authentifiés.
- Tout membre authentifié et autorisé peut créer/modifier/supprimer n'importe quelle
  tâche, objectif, commentaire ou pièce jointe (pas de granularité de droits en v1).

## Hébergement & CI/CD
- Déploiement manuel pour l'instant : `npm run build` puis `firebase deploy --only
  hosting` (et `--only firestore:rules` quand les règles changent). Le dépôt GitHub
  n'est pas encore relié à un déploiement continu (piste v2 : GitHub Actions avec un
  compte de service Firebase en secret du repo).

## Documents du projet
Les artefacts de cadrage (brief, architecture, spec fonctionnelle, user stories) sont
versionnés en Markdown dans `documents/` :
- `01-product-brief.md`
- `02-architecture.md`
- `03-functional-spec.md`
- `04-user-stories.md`

## Tests prévus par couche
- Unitaire : logique métier pure (calculs de budget, agrégations d'avancement,
  découpage/réassemblage des pièces jointes en morceaux).
- Composants : rendu et interactions (formulaires tâche, liste filtrée, upload).
- Intégration : règles de sécurité Firestore via l'émulateur (vérifier qu'un email hors
  liste est bien rejeté, y compris sur les morceaux de pièces jointes, etc.).
- E2E (optionnel v1) : parcours "créer tâche → affecter → uploader devis → clôturer".
