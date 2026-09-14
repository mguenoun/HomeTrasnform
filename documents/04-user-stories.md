# User Stories — HomeTransform

Convention : `US-<epic>.<n>`. Priorité P0 (indispensable v1) / P1 (important) / P2 (confort).

## Epic 0 — Socle technique
**US-0.1** (P0) — En tant que développeur, je veux un projet React/TypeScript/Vite avec
Tailwind, React Router et Firebase configuré via variables d'environnement, afin de
pouvoir construire les fonctionnalités sur une base saine et déployable.
- Critères :
  - `npm run dev` lance l'app en local.
  - `npm run build` produit un bundle statique.
  - `npm run test` exécute la suite Vitest.
  - Config Firebase lue depuis `import.meta.env.VITE_FIREBASE_*`, avec `.env.example`
    versionné et `.env.local` ignoré par git.

**US-0.2** (P0) — En tant que développeur, je veux les règles de sécurité Firestore
écrites et testées avec l'émulateur, afin de garantir que seuls les membres
autorisés accèdent aux données.
- Critères :
  - Un utilisateur non authentifié ne peut ni lire ni écrire.
  - Un utilisateur authentifié dont l'email n'est pas dans `familymembers` est rejeté.
  - Un fichier > 10 Mo ou d'un type non autorisé est rejeté avant tout envoi.

**US-0.3** (P0) — En tant que mainteneur, je veux un déploiement (manuel dans un
premier temps, automatisable ensuite) vers Firebase Hosting, afin que chaque
changement validé puisse être mis en ligne simplement.

## Epic 1 — Authentification & accès
**US-1.1** (P0) — En tant que membre de la famille, je veux me connecter avec mon
compte Google, afin d'accéder à l'application sans créer de mot de passe.
- Critères : bouton de connexion Google visible si déconnecté ; redirection vers le
  tableau de bord après connexion réussie.

**US-1.2** (P0) — En tant que membre non autorisé, je veux voir un message clair si mon
compte n'est pas reconnu, afin de comprendre pourquoi je ne peux pas accéder à l'app.
- Critères : email hors liste `familymembers` → message d'erreur + déconnexion
  automatique, aucune donnée chargée.

**US-1.3** (P1) — En tant que membre connecté, je veux pouvoir me déconnecter, afin de
libérer l'accès sur un appareil partagé.

## Epic 2 — Gestion des objectifs
**US-2.1** (P0) — En tant que membre, je veux créer un objectif (titre, description,
date cible), afin de regrouper les tâches qui y contribuent.

**US-2.2** (P0) — En tant que membre, je veux voir la liste des objectifs avec leur %
d'avancement et leur budget total, afin d'avoir une vue d'ensemble des projets en cours.

**US-2.3** (P1) — En tant que membre, je veux éditer un objectif existant, afin de
corriger ou préciser ses informations.

**US-2.4** (P1) — En tant que membre, je veux archiver un objectif, afin de le masquer
du tableau de bord sans perdre l'historique des tâches associées.

**US-2.5** (P2) — En tant que membre, je veux supprimer un objectif, les tâches liées
devenant alors des tâches libres, afin de nettoyer un objectif créé par erreur sans
perdre les tâches.

## Epic 3 — Gestion des tâches
**US-3.1** (P0) — En tant que membre, je veux créer une tâche avec titre, type (ménage /
travaux / achat / sous-traitance), description, pièce et priorité, éventuellement
rattachée à un objectif, afin de lister ce qu'il reste à faire.

**US-3.2** (P0) — En tant que membre, je veux voir la liste de toutes les tâches avec
filtres (type, statut, pièce, assigné, objectif) et tri (priorité, échéance, budget),
afin de retrouver rapidement une tâche.

**US-3.3** (P0) — En tant que membre, je veux ouvrir le détail d'une tâche et modifier
tous ses champs, afin de tenir l'information à jour.

**US-3.4** (P0) — En tant que membre, je veux changer le statut d'une tâche (à faire /
en cours / bloqué / terminé), afin de suivre sa progression.
- Critères : passage à "terminé" fige `budgetActual` et horodate la clôture (`closedAt`,
  `closedBy`).

**US-3.5** (P1) — En tant que membre, je veux supprimer une tâche, afin de retirer une
entrée créée par erreur.

## Epic 4 — Affectation
**US-4.1** (P0) — En tant que membre, je veux affecter une tâche à un ou plusieurs
membres (moi-même inclus), afin de clarifier qui s'en occupe.

**US-4.2** (P1) — En tant que membre, je veux filtrer le tableau de bord et la liste des
tâches sur "mes tâches", afin de voir rapidement ce qui m'est assigné.

## Epic 5 — Budget & suivi
**US-5.1** (P0) — En tant que membre, je veux saisir un budget estimé et un budget réel
sur une tâche de type achat ou sous-traitance, afin de suivre la dépense associée.

**US-5.2** (P0) — En tant que membre, je veux consulter une vue budget agrégeant le
total engagé et dépensé par objectif et par type de tâche, afin de piloter le budget
global du projet.

**US-5.3** (P1) — En tant que membre, je veux que les tâches en dépassement (réel >
estimé) soient visuellement mises en évidence, afin de repérer rapidement les
dérives budgétaires.

## Epic 6 — Pièces jointes
**US-6.1** (P0) — En tant que membre, je veux uploader un ou plusieurs fichiers (devis,
facture, photo) sur une tâche, afin de centraliser les justificatifs.
- Critères : types acceptés PDF/JPG/PNG, taille max 10 Mo, rejet avec message clair
  sinon.

**US-6.2** (P0) — En tant que membre, je veux voir la liste des pièces jointes d'une
tâche (nom, type, taille, auteur, date) et pouvoir les télécharger/prévisualiser, afin
de consulter les justificatifs associés.

**US-6.3** (P1) — En tant que membre, je veux supprimer n'importe quelle pièce jointe
d'une tâche (même uploadée par un autre membre), afin de retirer un fichier obsolète ou
erroné.

## Epic 7 — Commentaires & historique
**US-7.1** (P1) — En tant que membre, je veux ajouter un commentaire texte sur une
tâche, afin d'échanger des informations avec les autres membres sans sortir de l'app.

**US-7.2** (P2) — En tant que membre, je veux voir qui a clos une tâche et quand, afin
de garder une traçabilité minimale des décisions.

## Epic 8 — Tableau de bord
**US-8.1** (P0) — En tant que membre, je veux un tableau de bord affichant, par
objectif, le % d'avancement et le budget engagé/dépensé, afin d'avoir une vue globale
en un coup d'œil.

**US-8.2** (P1) — En tant que membre, je veux voir sur le tableau de bord les tâches à
échéance proche et les tâches bloquées, afin de prioriser les actions de la semaine.

## Ordre d'implémentation proposé
1. Epic 0 (socle + sécurité) — prérequis technique.
2. Epic 1 (auth) — nécessaire pour tout accès aux données.
3. Epic 2 + 3 (objectifs + tâches) — cœur métier.
4. Epic 4 (affectation) — vient naturellement avec les tâches.
5. Epic 5 (budget) — s'appuie sur les tâches existantes.
6. Epic 6 (pièces jointes) — fonctionnalité ajoutée sur la tâche.
7. Epic 7 (commentaires/historique) — enrichissement.
8. Epic 8 (tableau de bord) — agrège tout ce qui précède, donc en dernier.

Chaque story est livrée avec ses tests (unitaires/composants a minima, règles de
sécurité Firestore pour tout ce qui touche aux données).
