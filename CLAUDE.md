# CLAUDE.md — HomeTransform

Instructions de travail pour Claude Code sur ce dépôt. Complété par :
- [`notes.md`](notes.md) — état d'avancement, décisions prises, prochaines étapes.
- [`skills.md`](skills.md) — procédure pas-à-pas pour une correction/évolution
  (code + doc + tests + déploiement), et permissions déjà accordées sur ce projet.
- [`documents/`](documents/) — brief produit, architecture, spec fonctionnelle,
  user stories (avec statut ✅ Fait / 🚧 Partiel / ⬜ Prévu).

## Projet en un coup d'œil

- Frontend : React + TypeScript + Vite + Tailwind, sur Firebase Hosting
  (projet `hometransform-c2ac9`, plan Spark gratuit).
- Données : Firestore, temps réel (`onSnapshot`), aucun backend applicatif —
  toute la logique d'accès vit dans `firebase-rules/firestore.rules`.
- Notifications push + rappels d'échéance : Worker Cloudflare séparé, dossier
  `worker/` (voir `documents/02-architecture.md`).
- Deux dépôts de code, deux déploiements indépendants : le SPA (Firebase) et
  le Worker (Cloudflare). Rien n'est automatique — voir *Déploiement* ci-dessous.

## Commandes validées

Depuis la racine du dépôt (le SPA) :

```bash
npm install              # dépendances
npm run dev               # serveur de dev Vite
npm run build              # tsc -b && vite build — build de prod + vérif des types
npm run test                # vitest run — unitaire + composants
npm run test:watch           # vitest en mode watch
npm run lint                  # oxlint
npx firebase deploy --only hosting              # déploie dist/
npx firebase deploy --only firestore:rules      # déploie les règles Firestore
npx firebase deploy --only firestore:rules --dry-run   # valide la SYNTAXE des règles sans déployer
```

Depuis `worker/` (non exercé dans les sessions passées — à vérifier avant de
s'y fier) :

```bash
npm run dev           # wrangler dev
npm run deploy          # wrangler deploy
npm run test              # vitest run
npm run typecheck          # tsc --noEmit
```

## Ce qui NE marche PAS ici, et pourquoi

- **`npm run test:rules` marche en fait dans cet environnement — correctif
  d'une note précédente qui était fausse.** `firebase emulators:exec
  --only firestore,auth ...` nécessite un JDK ≥ 21 sur le PATH, et `java
  -version` par défaut sur ce poste montre bien 1.8 (trop ancien) — mais un
  second JDK 21 est installé à part, à `D:\Java21\bin\java.exe` (Temurin
  21.0.7), juste pas en tête de PATH. **Commande qui marche** (Bash/Git Bash) :
  ```bash
  PATH="/d/Java21/bin:$PATH" npm run test:rules
  ```
  (en PowerShell : `$env:Path = "D:\Java21\bin;" + $env:Path` avant la
  commande). Vérifié en conditions réelles : a permis de détecter puis
  corriger une vraie fuite de confidentialité en production (objectif privé
  visible par un autre membre de la famille, cf. `notes.md` 2026-10-03) que
  la seule relecture manuelle + `--dry-run` n'avait pas révélée. **Ne plus
  répéter l'ancienne conclusion "JDK non disponible, repli sur relecture
  manuelle"** — toujours essayer la commande ci-dessus en premier ; se
  rabattre sur `--dry-run` + relecture manuelle seulement si elle échoue
  réellement sur le poste utilisé. `--dry-run` seul valide la compilation
  (erreurs de syntaxe) mais **pas** la logique (permissions accordées/
  refusées), et surtout **pas le comportement des requêtes de liste**, qui
  peut différer de celui d'un `getDoc()` ciblé (voir l'entrée "Pièges
  rencontrés" ci-dessous sur la dénormalisation de `visibility`) — un point
  qu'une relecture manuelle du fichier de règles ne permet pas de détecter
  de façon fiable, seul l'émulateur le peut.
- **Ne jamais explorer/extraire les identifiants stockés** (token OAuth de
  `firebase-tools`, ADC `gcloud`, clés de compte de service) pour tenter un
  accès Firestore "admin" depuis ce poste — un classificateur de sécurité
  bloque explicitement ce type d'action, et c'est le comportement voulu, pas
  une limitation à contourner. Si une tâche semble exiger un accès Firestore
  élevé (script de migration, écriture qui ignore les règles), d'abord se
  demander si on peut l'éviter (champs optionnels avec valeur par défaut
  côté client ET côté règles, plutôt qu'une migration) ; sinon, demander à
  l'utilisateur de vérifier/exécuter lui-même.
- **`gcloud` n'est pas utilisable pour ce projet** : sur cette machine,
  `gcloud` est authentifié pour un *autre* projet de l'utilisateur (compte et
  projet différents). Ne jamais lancer `gcloud config set ...` ou reconnecter
  `gcloud` pour HomeTransform — utiliser uniquement le CLI `firebase` (voir
  `skills.md` pour l'état d'authentification déjà en place).
- **Pas de CI/CD** : push sur GitHub ne déploie rien. Après un commit/push, il
  faut explicitement lancer `npm run build` puis
  `npx firebase deploy --only hosting` (et `--only firestore:rules` si les
  règles ont changé). Oublier cette étape est l'erreur la plus fréquente —
  une session entière peut sembler "terminée" côté git sans que rien ne soit
  réellement en ligne.
- **Le Worker Cloudflare n'a jamais été déployé depuis une session Claude
  Code sur ce projet** (pas de `wrangler deploy` exécuté à ce jour). Toute
  modification dans `worker/` doit être signalée comme "code modifié, à
  déployer manuellement" tant que cet accès n'a pas été vérifié — voir
  `skills.md`.

## Pièges rencontrés (et solutions validées)

- **`Intl.NumberFormat("fr-FR")` insère un espace fine insécable (U+202F)**
  comme séparateur de milliers (`formatMad`, `src/domain/money.ts`), pas une
  espace normale. Deux cas différents, ne pas les confondre :
  - Comparaison directe de chaîne (`expect(formatMad(1234.5)).toBe(...)`) :
    il **faut** le vrai caractère Unicode U+202F lui-même dans la
    chaîne attendue (pas la séquence texte backslash-u-202f telle quelle).
  - Requête React Testing Library sur le DOM rendu (`getByText`, `queryByText`) :
    RTL normalise le texte du DOM (collapse `\s`, qui matche U+202F, en
    espace normale) **mais ne normalise pas la chaîne de requête**. Il faut
    donc une espace normale dans la requête, sinon "Unable to find an
    element..." alors que le texte est bien affiché.
  - Pour corriger un fichier de test existant sans se tromper de caractère :
    `sed` matche par octet, pas par caractère — un `.` ne couvre qu'un octet
    de la séquence UTF-8 à 3 octets de U+202F (`e2 80 af`), donc utiliser
    `.*` (greedy) ou un one-liner Node (`fs.readFileSync`/`writeFileSync` +
    `replace`) pour remplacer de façon fiable. `xxd` sur la ligne concernée
    confirme l'octet exact en cas de doute.
- **Ajouter un nouveau hook à une page cassera silencieusement ses tests
  existants** si ce hook n'est pas mocké : le hook réel (Firebase) tourne
  dans jsdom sans crasher, mais reste en `loading: true` indéfiniment → la
  page affiche "Chargement..." pour toujours → tous les `getByText(...)` du
  test échouent avec "Unable to find...". Réflexe systématique après avoir
  ajouté un `useXxx()` dans une page : `grep` ses fichiers de test associés,
  ajouter `vi.mock(...)` + `mockedUseXxx.mockReturnValue(...)` dans **chaque**
  `it()` du fichier, pas seulement les nouveaux tests.
- **Champ Firestore potentiellement absent sur d'anciens documents**
  (ex. `Objective.visibility`, ajouté après coup) : ne jamais lire ce champ
  par accès point dans les règles (`resource.data.visibility`) sans être
  certain du comportement du moteur sur un champ manquant — utiliser
  `resource.data.get('visibility', 'shared')` (méthode documentée, valeur
  par défaut explicite), qui lève toute ambiguïté et reste rétro-compatible
  sans script de migration.
- **Firestore n'applique PAS les règles de sécurité document par document sur
  une requête de LISTE** (`onSnapshot(collection(...))`/`getDocs()` sans
  `where()` correspondant à la condition de la règle) quand cette condition
  dépend d'un `get()`/`exists()` sur un AUTRE document — contrairement à un
  `getDoc()` ciblé sur un seul document, qui lui applique bien la règle
  correctement. Résultat concret et déjà vécu : la règle `objectives` (et
  `tasks`/`budgetItems`, qui vérifiaient la visibilité de l'objectif
  référencé via `get()`) refusait bien un `getDoc()` direct sur l'objectif
  privé de quelqu'un d'autre, mais un `onSnapshot(collection(db,
  "objectives"))` sans filtre — exactement ce que faisaient `useObjectives`/
  `useTasks`/`useBudgetItems` — renvoyait quand même ce document à tout le
  monde : **fuite de confidentialité réelle en production**, découverte via
  un signalement utilisateur ("ma fille a vu mon objectif privé"), confirmée
  et reproduite avec l'émulateur (voir l'entrée juste au-dessus sur
  `npm run test:rules`), avant d'être corrigée le 2026-10-03.
  **Seul correctif fiable** : la condition de la règle doit pouvoir être
  prouvée par Firestore à partir du `where()` de la requête elle-même, donc
  dépendre uniquement de champs du document lui-même, jamais d'un `get()` sur
  un autre document. Pour `objectives`, la règle était déjà basée sur ses
  propres champs (`visibility`, `createdBy`) : il suffisait de remplacer le
  `onSnapshot(collection(...))` sans filtre par deux requêtes `where()`
  fusionnées côté client (`where('visibility','==','shared')` +
  `where('createdBy','==',uid)`, voir `src/firebase/sharedOrOwnSubscription.ts`)
  — Firestore sait alors prouver chaque requête sûre à partir de sa propre
  contrainte. Pour `tasks`/`budgetItems`, dont la visibilité dépendait d'un
  `get()` sur l'objectif référencé (pas un champ propre), il a fallu en plus
  **dénormaliser un champ `visibility` directement sur chaque tâche/rubrique**
  (recopié depuis l'objectif à la création/modification, re-vérifié
  côté règles via une contrainte d'égalité pour empêcher un client de mentir
  dessus, et re-propagé en cascade si la visibilité de l'objectif change
  après coup — voir `updateObjective`/`cascadeVisibilityToChildren` dans
  `src/services/objectives.ts`) avant de pouvoir appliquer la même technique
  de requêtes fusionnées. **Auto-guérison des documents créés avant l'ajout
  de ce champ** : plutôt qu'un script de migration, chaque abonnement
  "mine" (`where('createdBy','==',uid)`, qui ne dépend pas du champ
  `visibility` et voit donc toujours mes propres documents même sans ce
  champ) corrige silencieusement `visibility` en arrière-plan dès qu'il
  rencontre un de MES documents qui ne l'a pas encore — jamais les documents
  des autres, donc toujours autorisé par les règles sans droits élevés.
  **Leçon générale, à vérifier systématiquement pour toute nouvelle règle de
  confidentialité par document dans une collection par ailleurs partiellement
  publique** : écrire un test d'émulateur qui fait un `getDocs()`/
  `onSnapshot()` SANS filtre (liste complète) en plus des tests `getDoc()`
  ciblés habituels — ce sont deux chemins distincts dans Firestore, et seul
  le second est couvert par un `getDoc()` qui passe. Voir
  `firebase-rules/__tests__/firestore.rules.test.ts` pour le test de
  non-régression qui documente volontairement qu'une requête non filtrée
  reste dangereuse même après correctif (pour ne pas en réintroduire une par
  erreur côté client).
- **`signInWithPopup` déclenche une alerte de sécurité Google** ("navigateur
  non sécurisé") quand l'app tourne en PWA installée (contexte proche d'une
  WebView pour la détection Google), alors que le web classique n'est pas
  affecté. Utiliser `signInWithRedirect` + `getRedirectResult()` — c'est le
  flux retenu dans `src/context/AuthContext.tsx`, ne pas revenir à
  `signInWithPopup`.
- **`signInWithRedirect` restait bloqué sur l'écran de connexion en PWA
  installée sur iOS** (systématique, sans erreur affichée) alors qu'il
  fonctionnait en navigateur classique. Cause : `authDomain` pointait vers le
  domaine par défaut `hometransform-c2ac9.firebaseapp.com`, différent de
  l'origine d'hébergement (`hometransform-c2ac9.web.app`) — le relais du
  résultat de redirection passe par une iframe cachée sur `authDomain` qui
  communique via `postMessage`/stockage avec l'origine de l'app ; en PWA
  standalone iOS, l'Intelligent Tracking Prevention de Safari bloque cet
  accès au stockage cross-origin dans l'iframe, donc `getRedirectResult()` se
  résout silencieusement sans utilisateur (pas d'erreur à catcher). **Corrigé**
  en pointant `authDomain` vers le domaine d'hébergement lui-même
  (`VITE_FIREBASE_AUTH_DOMAIN=hometransform-c2ac9.web.app` dans `.env.local`,
  non commité — Firebase Hosting sert automatiquement `/__/auth/**` sur son
  propre domaine quand Auth est activé sur le projet, donc aucune config
  `firebase.json` supplémentaire n'est nécessaire) : tout reste alors
  same-origin, plus d'iframe cross-origin à bloquer. Si le souci reperçait
  malgré tout, vérifier dans la console Firebase (Authentication > Settings >
  Authorized domains) que `hometransform-c2ac9.web.app` y figure bien (ajouté
  automatiquement par Firebase à la création du projet, à confirmer si un
  domaine personnalisé est ajouté plus tard). **Étape supplémentaire
  nécessaire, distincte des Authorized domains Firebase** : le client OAuth
  Google (Google Cloud Console → « Google Auth Platform » → Clients → le
  client web auto-créé par Firebase, ex. `93942982710-kch...`) a sa propre
  liste blanche « URI de redirection autorisés », indépendante de la config
  Firebase. Il faut y ajouter `https://hometransform-c2ac9.web.app/__/auth/handler`
  (en plus de l'URI `firebaseapp.com` existante, ne pas la retirer) — sans ça,
  Google refuse avec `Erreur 400 : redirect_uri_mismatch`. Cette console a des
  échecs de sauvegarde transitoires fréquents (« Échec de l'action. Veuillez
  réessayer. ») sans rapport avec la saisie — réessayer suffit. Propagation
  annoncée « 5 minutes à quelques heures », effective en pratique en
  quelques minutes le plus souvent. Confirmé fonctionnel en PWA iOS après ce
  double correctif (`authDomain` + URI de redirection OAuth).
- **Une PWA déjà installée peut servir un bundle JS périmé plus d'une heure**
  après un déploi : Firebase Hosting appliquait `Cache-Control: max-age=3600`
  par défaut, y compris sur `index.html`. Corrigé via `firebase.json` →
  `hosting.headers` : `index.html`/`sw.js`/`manifest.webmanifest` en
  `no-cache`, `/assets/**` (noms hachés par build) en `immutable`. Même avec
  ce correctif, une PWA iOS déjà ouverte peut ne pas revérifier au simple
  passage arrière-plan/premier-plan — il faut la fermer complètement (swipe
  dans le multitâche) avant de rouvrir, et en dernier recours vider les
  données du site dans Réglages > Safari > Avancé.
- **Installation PWA sur iOS/Safari** : pas de bannière automatique
  (`beforeinstallprompt` n'existe pas sur iOS). Le geste réel confirmé par
  l'utilisateur : appui long sur l'adresse tout en bas de l'écran → menu
  « Partager »/« Share » → « Sur l'écran d'accueil »/« Add to Home Screen »
  → « Ajouter »/« Add ». Ne pas décrire ça comme un simple tap sur une icône
  de partage.
- **Le nom de la collection `familymembers` est sensible à la casse** et doit
  rester tout en minuscules dans Firestore — une collection nommée
  différemment (`familyMembers`) ferait échouer silencieusement `exists()`
  pour tout le monde, verrouillant l'accès à toute la famille. Commentaire
  déjà en place dans `firebase-rules/firestore.rules`, à ne pas retirer.
- **Le classificateur de permissions Edit/Write peut échouer de façon
  transitoire** ("no verdict (error)") sans rapport avec le contenu de
  l'action. Ne pas enchaîner les tentatives : faire une autre tâche en
  lecture seule quelques instants, puis retenter une fois — ça se résout
  généralement seul.

## Procédure de livraison validée

1. Décomposer une évolution large en étapes indépendamment déployables
   (ex. le passage au budget par rubriques s'est fait en 4 commits :
   fondations/règles, écrans, intégration objectif/tâche/dashboard,
   nettoyage des anciens champs).
2. Avant de toucher des règles de sécurité ou un modèle de données avec
   plusieurs choix possibles, proposer une conception courte et valider les
   points ambigus (ex. via une question ciblée) avant d'écrire le code —
   c'est plus rapide qu'un aller-retour après coup sur une règle Firestore
   mal calibrée.
3. Après chaque changement : `npx tsc -b` (ou `npm run build`), lancer les
   tests du fichier concerné puis `npx vitest run` complet, puis
   `npx oxlint src/`. Ne commit qu'une fois tout vert.
4. Commit en français, message expliquant le **pourquoi** plutôt que la
   liste des fichiers touchés, terminé par la ligne d'attribution demandée
   par le système. Un commit séparé pour la doc quand elle est mise à jour
   après coup (pas mélangée au code).
5. `git push origin master` puis déployer explicitement (`firebase deploy`,
   voir *Commandes validées*) — le push seul ne suffit pas.
6. Mettre à jour `documents/` (statut ✅/🚧/⬜) et `notes.md` quand une
   fonctionnalité change d'état — voir `skills.md` pour le détail.
