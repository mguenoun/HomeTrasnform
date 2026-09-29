# User Stories — HomeTransform

Convention : `US-<epic>.<n>`. Priorité P0 (indispensable v1) / P1 (important) / P2 (confort).

**Statut** : ✅ Fait · 🚧 Partiel · ⬜ Prévu (pas commencé). Mis à jour au 2026-09-28.

## Epic 0 — Socle technique
**US-0.1** (P0) — En tant que développeur, je veux un projet React/TypeScript/Vite avec
Tailwind, React Router et Firebase configuré via variables d'environnement, afin de
pouvoir construire les fonctionnalités sur une base saine et déployable. — ✅ Fait
- Critères :
  - `npm run dev` lance l'app en local.
  - `npm run build` produit un bundle statique.
  - `npm run test` exécute la suite Vitest.
  - Config Firebase lue depuis `import.meta.env.VITE_FIREBASE_*`, avec `.env.example`
    versionné et `.env.local` ignoré par git.

**US-0.2** (P0) — En tant que développeur, je veux les règles de sécurité Firestore
écrites et testées avec l'émulateur, afin de garantir que seuls les membres
autorisés accèdent aux données. — ✅ Fait
- Critères :
  - Un utilisateur non authentifié ne peut ni lire ni écrire.
  - Un utilisateur authentifié dont l'email n'est pas dans `familymembers` est rejeté.
  - Un fichier > 10 Mo ou d'un type non autorisé est rejeté avant tout envoi.

**US-0.3** (P0) — En tant que mainteneur, je veux un déploiement (manuel dans un
premier temps, automatisable ensuite) vers Firebase Hosting, afin que chaque
changement validé puisse être mis en ligne simplement. — 🚧 Partiel (déploiement manuel
opérationnel : `firebase deploy --only hosting` / `--only firestore:rules` ; pas encore
de CI/CD automatisé).

## Epic 1 — Authentification & accès
**US-1.1** (P0) — En tant que membre de la famille, je veux me connecter avec mon
compte Google, afin d'accéder à l'application sans créer de mot de passe. — ✅ Fait
- Critères : bouton de connexion Google visible si déconnecté ; redirection vers le
  tableau de bord après connexion réussie.

**US-1.2** (P0) — En tant que membre non autorisé, je veux voir un message clair si mon
compte n'est pas reconnu, afin de comprendre pourquoi je ne peux pas accéder à l'app. — ✅ Fait
- Critères : email hors liste `familymembers` → message d'erreur + déconnexion
  automatique, aucune donnée chargée.

**US-1.3** (P1) — En tant que membre connecté, je veux pouvoir me déconnecter, afin de
libérer l'accès sur un appareil partagé. — ✅ Fait

## Epic 2 — Gestion des objectifs
**US-2.1** (P0) — En tant que membre, je veux créer un objectif (titre, description,
date cible), afin de regrouper les tâches qui y contribuent. — ✅ Fait

**US-2.2** (P0) — En tant que membre, je veux voir la liste des objectifs avec leur %
d'avancement et leur budget total, afin d'avoir une vue d'ensemble des projets en cours. — ✅ Fait
(le budget affiché provient désormais des rubriques budgétaires liées à l'objectif,
voir Epic 5).

**US-2.3** (P1) — En tant que membre, je veux éditer un objectif existant, afin de
corriger ou préciser ses informations. — ✅ Fait

**US-2.4** (P1) — En tant que membre, je veux archiver un objectif, afin de le masquer
du tableau de bord sans perdre l'historique des tâches associées. — ✅ Fait

**US-2.5** (P2) — En tant que membre, je veux supprimer un objectif, les tâches liées
devenant alors des tâches libres, afin de nettoyer un objectif créé par erreur sans
perdre les tâches. — ✅ Fait

## Epic 3 — Gestion des tâches
**US-3.1** (P0) — En tant que membre, je veux créer une tâche avec titre, type (ménage /
travaux / achat / sous-traitance), description, pièce et priorité, éventuellement
rattachée à un objectif, afin de lister ce qu'il reste à faire. — ✅ Fait

**US-3.2** (P0) — En tant que membre, je veux voir la liste de toutes les tâches avec
filtres (type, statut, pièce, assigné, objectif) et tri (priorité, échéance),
afin de retrouver rapidement une tâche. — ✅ Fait

**US-3.3** (P0) — En tant que membre, je veux ouvrir le détail d'une tâche et modifier
tous ses champs, afin de tenir l'information à jour. — ✅ Fait

**US-3.4** (P0) — En tant que membre, je veux changer le statut d'une tâche (à faire /
en cours / bloqué / terminé), afin de suivre sa progression. — ✅ Fait
- Critères : passage à "terminé" horodate la clôture (`closedAt`, `closedBy`).

**US-3.5** (P1) — En tant que membre, je veux supprimer une tâche, afin de retirer une
entrée créée par erreur. — ✅ Fait

## Epic 4 — Affectation
**US-4.1** (P0) — En tant que membre, je veux affecter une tâche à un ou plusieurs
membres (moi-même inclus), afin de clarifier qui s'en occupe. — ✅ Fait

**US-4.2** (P1) — En tant que membre, je veux filtrer le tableau de bord et la liste des
tâches sur "mes tâches", afin de voir rapidement ce qui m'est assigné. — ✅ Fait

## Epic 5 — Budget & suivi
> Modèle revu en septembre 2026 : le budget n'est plus porté par les champs d'une
> tâche, mais par des **rubriques budgétaires** (`budgetItems`) pouvant être liées à un
> objectif et/ou une tâche, avec une chaîne budget → engagé → réalisé → prévision à
> terminaison → écart.

**US-5.1** (P0) — En tant que membre, je veux créer une rubrique budgétaire (budget,
engagé, fournisseur, catégorie), éventuellement liée à un objectif et/ou une tâche,
afin de suivre une dépense prévue. — ✅ Fait

**US-5.2** (P0) — En tant que membre, je veux enregistrer des paiements datés sur une
rubrique (prévu ou payé), afin que le réalisé se déduise automatiquement de ce qui a
été payé. — ✅ Fait

**US-5.3** (P0) — En tant que membre, je veux consulter une vue budget agrégeant
budget, engagé, réalisé, prévision à terminaison et écart par rubrique, afin de piloter
le budget global du projet et repérer les dépassements. — ✅ Fait

**US-5.4** (P1) — En tant que membre, je veux que les rubriques en dépassement (réalisé
ou prévision au-delà du budget) soient visuellement mises en évidence — y compris dans
une liste "à surveiller" sur le tableau de bord —, afin de repérer rapidement les
dérives budgétaires. — ✅ Fait

**US-5.5** (P1) — En tant que membre, je veux pouvoir réviser manuellement la prévision
à terminaison d'une rubrique (avec un motif) et consulter l'historique de ces
révisions, afin de suivre l'évolution d'une estimation dans le temps. — ✅ Fait

**US-5.6** (P2) — En tant que membre, je veux joindre un justificatif (devis, facture) à
un paiement, afin de conserver la preuve associée. — ⬜ Prévu (le modèle de données le
permet, non implémenté).

## Epic 6 — Pièces jointes
**US-6.1** (P0) — En tant que membre, je veux uploader un ou plusieurs fichiers (devis,
facture, photo) sur une tâche, afin de centraliser les justificatifs. — ✅ Fait
- Critères : types acceptés PDF/JPG/PNG, taille max 10 Mo, rejet avec message clair
  sinon.

**US-6.2** (P0) — En tant que membre, je veux voir la liste des pièces jointes d'une
tâche (nom, type, taille, auteur, date) et pouvoir les télécharger/prévisualiser, afin
de consulter les justificatifs associés. — ✅ Fait

**US-6.3** (P1) — En tant que membre, je veux supprimer n'importe quelle pièce jointe
d'une tâche (même uploadée par un autre membre), afin de retirer un fichier obsolète ou
erroné. — ✅ Fait

## Epic 7 — Commentaires & historique
**US-7.1** (P1) — En tant que membre, je veux ajouter un commentaire texte sur une
tâche, afin d'échanger des informations avec les autres membres sans sortir de l'app. — ✅ Fait

**US-7.2** (P2) — En tant que membre, je veux voir qui a clos une tâche et quand, afin
de garder une traçabilité minimale des décisions. — ✅ Fait

## Epic 8 — Tableau de bord
**US-8.1** (P0) — En tant que membre, je veux un tableau de bord affichant, par
objectif, le % d'avancement, afin d'avoir une vue globale en un coup d'œil. — ✅ Fait

**US-8.2** (P1) — En tant que membre, je veux voir sur le tableau de bord les tâches à
échéance proche et les tâches bloquées, afin de prioriser les actions de la semaine. — ✅ Fait

**US-8.3** (P1) — En tant que membre, je veux voir sur le tableau de bord des KPI
globaux (objectifs clôturés, tâches clôturées, budget réalisé/budgété) et une liste des
rubriques budgétaires à surveiller, afin d'avoir une vue de pilotage synthétique. — ✅ Fait

**US-8.4** (P1) — En tant que membre, je veux voir sur le tableau de bord, pour chaque
personne de la famille, le nombre de tâches en retard/clôturées/totales — avec ma
propre carte mise en avant et mes tâches à échéance proche listées séparément —, afin
de savoir qui doit faire quoi. — ✅ Fait

## Epic 9 — Notifications & rappels
**US-9.1** (P1) — En tant que membre, je veux activer les notifications push sur mon
appareil, afin d'être alerté sans avoir l'app ouverte. — ✅ Fait

**US-9.2** (P1) — En tant que membre, je veux recevoir une notification push quand une
tâche m'est assignée, afin d'être informé sans consulter l'app activement. — ✅ Fait

**US-9.3** (P1) — En tant que membre assigné, je veux recevoir un rappel push
automatique quand l'échéance d'une de mes tâches approche (ou est dépassée), afin de ne
pas la manquer. — ✅ Fait
- Critères : rappel envoyé une fois par échéance (fenêtre de 2 jours), via une tâche
  planifiée quotidienne (Cloudflare Worker, cron 07:00) ; un nouveau rappel peut être
  envoyé si l'échéance est repoussée.

## Epic 10 — Installation (PWA)
**US-10.1** (P2) — En tant que membre, je veux pouvoir installer HomeTransform sur
l'écran d'accueil de mon téléphone (iOS/Android), afin d'y accéder comme une
application native. — ✅ Fait

**US-10.2** (P2) — En tant que membre sur iPhone/iPad, je veux des instructions claires
pour l'installation (Safari ne propose pas de bannière automatique), afin de réussir
l'installation du premier coup. — ✅ Fait

## Epic 11 — Navigation
**US-11.1** (P2) — En tant que membre, je veux un fil d'Ariane sur chaque page, afin de
me repérer et de revenir en arrière facilement. — ✅ Fait

## Ordre d'implémentation proposé
1. Epic 0 (socle + sécurité) — prérequis technique. — ✅ Fait
2. Epic 1 (auth) — nécessaire pour tout accès aux données. — ✅ Fait
3. Epic 2 + 3 (objectifs + tâches) — cœur métier. — ✅ Fait
4. Epic 4 (affectation) — vient naturellement avec les tâches. — ✅ Fait
5. Epic 5 (budget) — remodélisé en rubriques budgétaires. — ✅ Fait
6. Epic 6 (pièces jointes) — fonctionnalité ajoutée sur la tâche. — ✅ Fait
7. Epic 7 (commentaires/historique) — enrichissement. — ✅ Fait
8. Epic 8 (tableau de bord) — agrège tout ce qui précède. — ✅ Fait
9. Epic 9 (notifications & rappels) — ajouté hors plan initial. — ✅ Fait
10. Epic 10 (PWA) — ajouté hors plan initial. — ✅ Fait
11. Epic 11 (navigation) — ajouté hors plan initial. — ✅ Fait

Chaque story est livrée avec ses tests (unitaires/composants a minima, règles de
sécurité Firestore pour tout ce qui touche aux données).

**Reste à faire** : CI/CD automatisé (US-0.3), justificatifs de paiement (US-5.6).
