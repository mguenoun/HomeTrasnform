# HomeTransform

Application familiale pour organiser, planifier, affecter et suivre les tâches de
ménage/organisation, les travaux (peinture, création d'ouvertures...) et les achats
liés à la maison, avec suivi des budgets et de l'avancement par objectif.

Voir les documents de cadrage dans [`documents/`](documents/) : brief produit,
architecture, spécification fonctionnelle, user stories.

## Stack

React + TypeScript + Vite + Tailwind CSS. Authentification, données, fichiers et
hébergement — tout sur Firebase (Auth/Firestore/Hosting, plan Spark gratuit, aucune
carte bancaire). Les pièces jointes sont stockées directement dans Firestore,
découpées en morceaux côté client pour rester sous la limite de 1 Mio par document
(voir `src/domain/attachments.ts`) — pas de service de stockage de fichiers externe
(Firebase Storage et Cloudflare R2 ont tous deux été écartés car ils exigent une
carte bancaire même à usage gratuit).

## Démarrage local

1. Créer un projet Firebase (console.firebase.google.com), activer **Authentication
   → Google**, **Firestore** et **Hosting** (le plan Spark gratuit suffit, aucune
   carte bancaire requise pour ces trois services).
2. Copier `.env.example` en `.env.local` et renseigner les clés de config Firebase
   (Paramètres du projet → Vos applications → config SDK).
3. Ajouter les membres autorisés dans la collection Firestore `familymembers`
   (id du document = email du membre, ex: `familymembers/marie@example.com` —
   **attention à la casse**, c'est bien `familymembers` tout en minuscules, pas
   `familyMembers`).
4. Installer les dépendances puis lancer le serveur de dev :

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test        # tests unitaires et composants (Vitest)
npm run test:rules   # règles de sécurité Firestore via l'émulateur Firebase
npm run lint         # analyse statique (oxlint)
npm run build        # build de production + vérification des types
```

`npm run test:rules` nécessite un JDK 21+ sur le PATH (requis par l'émulateur
Firestore).

## Déploiement (Firebase Hosting)

Déploiement manuel pour l'instant (pas de CI/CD configuré) :

```bash
npm run build
npx firebase deploy --only hosting          # déploie dist/
npx firebase deploy --only firestore:rules  # si les règles ont changé
```

Nécessite d'être connecté au CLI (`npx firebase login`) avec un compte ayant accès
au projet Firebase.

## Structure

- `src/domain/` — logique métier pure (statuts de tâche, calculs de budget, découpage
  des pièces jointes), testée indépendamment de Firebase.
- `src/firebase/` — configuration du SDK Firebase (lue depuis les variables
  d'environnement).
- `src/context/` — contexte d'authentification.
- `src/pages/`, `src/components/` — UI.
- `firebase-rules/` — règles de sécurité Firestore, avec leurs tests via l'émulateur.
- `documents/` — artefacts de cadrage du projet (brief, architecture, spec, user
  stories).
