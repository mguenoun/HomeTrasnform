# HomeTransform

Application familiale pour organiser, planifier, affecter et suivre les tâches de
ménage/organisation, les travaux (peinture, création d'ouvertures...) et les achats
liés à la maison, avec suivi des budgets et de l'avancement par objectif.

Voir les documents de cadrage dans [`documents/`](documents/) : brief produit,
architecture, spécification fonctionnelle, user stories.

## Stack

React + TypeScript + Vite + Tailwind CSS, données et authentification via Firebase
(Auth/Firestore/Storage), hébergement statique sur Cloudflare Pages.

## Démarrage local

1. Créer un projet Firebase (console.firebase.google.com), activer **Authentication
   → Google**, **Firestore**, **Storage**.
2. Copier `.env.example` en `.env.local` et renseigner les clés de config Firebase
   (Paramètres du projet → Vos applications → config SDK).
3. Ajouter les membres autorisés dans la collection Firestore `familyMembers`
   (id du document = email du membre, ex: `familyMembers/marie@example.com`).
4. Installer les dépendances puis lancer le serveur de dev :

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test        # tests unitaires et composants (Vitest)
npm run test:rules   # règles de sécurité Firestore/Storage via l'émulateur Firebase
npm run lint         # analyse statique (oxlint)
npm run build        # build de production + vérification des types
```

`npm run test:rules` nécessite un JDK 21+ sur le PATH (requis par l'émulateur
Firestore/Storage).

## Déploiement (Cloudflare Pages)

1. Connecter le dépôt Git dans le dashboard Cloudflare Pages.
2. Build command : `npm run build` — Output directory : `dist`.
3. Renseigner les variables d'environnement (Settings → Environment variables) avec
   les mêmes clés que `.env.example` (`VITE_FIREBASE_API_KEY`, etc.), pour les
   environnements Production et Preview.
4. Chaque push sur `main` déclenche un déploiement automatique.

## Structure

- `src/domain/` — logique métier pure (statuts de tâche, calculs de budget), testée
  indépendamment de Firebase.
- `src/firebase/` — configuration du SDK Firebase (lue depuis les variables
  d'environnement).
- `src/context/` — contexte d'authentification.
- `src/pages/`, `src/components/` — UI.
- `firebase-rules/` — règles de sécurité Firestore et Storage, avec leurs tests via
  l'émulateur.
- `documents/` — artefacts de cadrage du projet (brief, architecture, spec, user
  stories).
