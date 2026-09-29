# Spécification fonctionnelle — HomeTransform

**Statut** : ✅ Fait · 🚧 Partiel · ⬜ Prévu (pas commencé). Mis à jour au 2026-09-28 —
correspond à l'état déployé sur `hometransform-c2ac9.web.app`.

## 0. Statut de réalisation (vue d'ensemble)

| Domaine | Statut |
|---|---|
| Authentification & accès | ✅ Fait |
| Objectifs (CRUD, archivage) | ✅ Fait |
| Tâches (CRUD, statuts, affectation) | ✅ Fait |
| Budget par rubriques (`budgetItems`) | ✅ Fait |
| Pièces jointes | ✅ Fait |
| Commentaires | ✅ Fait |
| Tableau de bord (KPI, par personne, à surveiller) | ✅ Fait |
| Notifications push (affectation + rappel d'échéance) | ✅ Fait |
| Installation PWA (iOS/Android) | ✅ Fait |
| Fil d'Ariane | ✅ Fait |
| Justificatifs sur un paiement | ⬜ Prévu |

## 1. Rôles et accès
- Un seul rôle : membre de la famille, connecté via Google Sign-In.
- Accès réservé aux emails inscrits dans la liste des membres autorisés (ajout manuel
  via Firestore au démarrage, pas d'auto-inscription).
- Toute personne connectée peut créer/modifier/affecter/clore n'importe quelle tâche ou
  objectif, et supprimer n'importe quelle pièce jointe (y compris uploadée par un autre
  membre) — pas de granularité de droits en v1.

## 2. Écrans principaux

### 2.1 Connexion — ✅ Fait
- Bouton "Se connecter avec Google".
- Si l'email connecté n'est pas dans la liste autorisée → message d'erreur explicite,
  déconnexion automatique.

### 2.2 Tableau de bord (accueil) — ✅ Fait
- KPI globaux : objectifs clôturés / total, tâches clôturées / total, budget réalisé /
  budgété (toutes rubriques confondues).
- Rubriques budgétaires à surveiller (réalisé ou prévision au-delà du budget), triées
  de la pire à la moins pire.
- Tâches par personne de la famille : en retard / clôturées / total, avec la carte de
  l'utilisateur connecté mise en avant (fond et libellé distincts) et placée en premier.
  Inclut les personnes autorisées (`familymembers`) qui ne se sont jamais encore
  connectées.
- Liste des objectifs actifs (carte : avancement, budget des rubriques liées).
- "Mes tâches à échéance proche" (propres à l'utilisateur connecté), puis les listes
  globales "à échéance proche" et "bloquées".

### 2.3 Liste des objectifs — ✅ Fait
- Carte par objectif : titre, description, date cible, statut, barre de progression,
  budget des rubriques liées.
- Créer / éditer / archiver un objectif.

### 2.4 Détail d'un objectif — ✅ Fait
- Infos de l'objectif + liste des tâches rattachées (filtrable par statut/type/assigné).
- Bouton "Ajouter une tâche à cet objectif".
- Section "Rubriques budgétaires" liées à l'objectif + bouton d'ajout (préremplit
  l'objectif dans le formulaire de création).

### 2.5 Liste des tâches (vue globale, tous objectifs confondus + tâches libres) — ✅ Fait
- Filtres : type (ménage / travaux / achat / sous-traitance), statut, pièce, assigné,
  objectif.
- Tri par priorité ou échéance.
- Filtre rapide "Mes tâches".

### 2.6 Détail d'une tâche — ✅ Fait
- Champs : titre, description, type, pièce, priorité, statut, assignés, échéance,
  objectif rattaché.
- Changement de statut (à faire → en cours → terminé, avec état parallèle bloqué),
  horodatage de clôture (`closedAt`, `closedBy`).
- Affectation : bascule d'assignés parmi les membres de la famille ; notification push
  au membre nouvellement assigné.
- Bloc pièces jointes : liste des fichiers (nom, type, taille, uploadé par, date),
  upload multi-fichiers, suppression (par tout membre), aperçu/téléchargement.
- Bloc commentaires : fil chronologique, ajout de commentaire texte.
- Section "Rubriques budgétaires" liées à la tâche + bouton d'ajout (préremplit la
  tâche, et l'objectif de la tâche s'il en a, dans le formulaire de création).

### 2.7 Budget — ✅ Fait
- Suivi par rubrique budgétaire (`budgetItems`), liée à un objectif et/ou une tâche,
  plutôt que par les champs d'une tâche.
- Chaîne budget (initial + révisé) → engagé → réalisé → prévision à terminaison → écart,
  avec paiements datés (`prevu`/`paye`) : le réalisé est toujours la somme des paiements
  payés.
- Prévision à terminaison ajustable manuellement (avec motif), historique des révisions
  conservé.
- Vue Budget dédiée : 5 KPI globaux (budget, engagé, réalisé, prévision, écart) et les
  rubriques triées, dépassements en tête. Création de rubrique dédiée (`/budget/new`),
  utilisable depuis la vue Budget, un objectif ou une tâche.
- Justificatif de paiement (devis/facture) — ⬜ Prévu, non implémenté (le modèle de
  données le permet).

### 2.8 Installation (PWA) — ✅ Fait
- Bannière d'installation sur Android/Chrome (invite native `beforeinstallprompt`).
- Instructions pas-à-pas sur iOS/Safari (pas de bannière automatique disponible) :
  appui long sur l'adresse en bas de l'écran → « Partager »/« Share » → « Sur l'écran
  d'accueil »/« Add to Home Screen » → « Ajouter »/« Add ».
- Bannière masquable, ne réapparaît pas après installation ou fermeture explicite.

### 2.9 Notifications push — ✅ Fait
- Activation/désactivation depuis la navigation (bouton visible si le navigateur
  supporte les notifications push et que l'utilisateur est connecté).
- Notification à l'affectation d'une tâche (au membre nouvellement assigné, pas à
  celui qui affecte).
- Rappel automatique quotidien pour les tâches non terminées dont l'échéance approche
  (fenêtre de 2 jours) ou est dépassée, envoyé une seule fois par échéance (voir
  `documents/02-architecture.md` pour le mécanisme).

### 2.10 Navigation — ✅ Fait
- Fil d'Ariane sur toutes les pages (Tableau de bord > Objectifs > … / Tâches > …).

## 3. Règles métier

**Statuts de tâche** : `à faire → en cours → terminé`, avec état parallèle `bloqué`
(peut être atteint depuis "à faire" ou "en cours", et en sortir vers "en cours").

**Budget** : voir la rubrique budgétaire (`budgetItems`) — indépendante du cycle de
vie de la tâche à laquelle elle est éventuellement liée. Devise : MAD (dirham
marocain).

**Affectation** :
- Une tâche peut avoir 0 (non affectée), 1 ou plusieurs assignés.
- Tout membre peut s'auto-affecter ou affecter un autre membre.
- Affecter une tâche à un autre membre lui envoie une notification push (s'il est
  abonné).

**Pièces jointes** :
- Types acceptés : PDF, images (jpg/png). Taille max 10 Mo/fichier.
- Rattachées à une tâche uniquement (pas au niveau objectif en v1).
- Suppression possible par tout membre (pas seulement l'uploadeur).

**Objectifs** :
- Un objectif peut être archivé (masqué du tableau de bord) sans supprimer les tâches
  liées.
- Suppression d'un objectif : les tâches liées deviennent "libres" (objectiveId = null),
  pas de suppression en cascade.

## 4. Parcours clés
1. **Créer un projet complet** : créer un objectif → ajouter plusieurs tâches (mix
   ménage/travaux/achats) → affecter aux membres → suivre l'avancement jusqu'à 100%.
2. **Piloter le budget d'un achat/sous-traitance** : créer une rubrique budgétaire liée
   à la tâche → renseigner le budget (et l'engagé si un devis est signé) → enregistrer
   les paiements au fil de l'eau (prévu puis payé) → surveiller l'écart jusqu'à
   clôture.
3. **Suivi hebdo familial** : ouvrir le tableau de bord → voir "mes tâches", les tâches
   bloquées et les rubriques à surveiller → mettre à jour statuts/commentaires.
4. **Installer l'app sur son téléphone** : ouvrir le lien dans le navigateur → suivre la
   bannière (Android) ou les instructions (iOS) → utiliser l'icône sur l'écran
   d'accueil, avec notifications push activées.

## 5. Non-fonctionnel
- Responsive mobile-first (usage probable sur téléphone en magasin/pendant les
  travaux).
- Installable comme PWA sur iOS et Android (voir 2.8) — reste une web app, pas
  d'application native ni de store.
- Temps réel : une modification par un membre est visible par les autres sans
  rafraîchissement manuel.
- Pas de mode offline en v1 (nécessite connexion) : le service worker ne gère que les
  notifications push, pas de cache applicatif.
