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

**US-6.4** (P1) — En tant que membre, je veux pouvoir joindre un fichier (devis,
facture) directement sur un objectif ou sur une rubrique budgétaire (pas seulement sur
une tâche), afin de rattacher un justificatif qui concerne tout un objectif ou une
rubrique sans le dupliquer sur chaque tâche liée. — ✅ Fait
- Même comportement/limites que sur une tâche (upload, liste, téléchargement,
  suppression, PDF/JPG/PNG, 10 Mo max).

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

## Epic 12 — Repas & Courses
Module indépendant des objectifs/tâches/budgets ; brief et décisions dans
[`05-module-repas-courses.md`](05-module-repas-courses.md). Livré par étapes.

**US-12.1** (P1) — En tant que membre, je veux planifier la semaine en posant des repas
(texte libre) dans des créneaux jour × (petit-déj, déjeuner, goûter, dîner), avec un
nombre de convives par repas, semaine du samedi au vendredi, 3 colonnes (snacks, déjeuner, dîner), saisie en arabe ou en français. — ✅ Fait (étape 1)
**US-12.2** (P1) — En tant que membre, je veux une liste de courses hebdomadaire
saisie à la main, groupée par point de vente avec le montant payé, que la famille coche en temps réel. — ✅ Fait (étape 1)
**US-12.3** (P1) — En tant que membre, je veux envoyer le programme et la liste de
courses sur WhatsApp, en français + darija. — ✅ Fait (programme, liste complète, et
commande par point de vente ; traductions saisies à la main ou suggérées, voir US-12.14)
**US-12.4** (P2) — Référentiel de plats avec ingrédients par variante (2-5 personnes,
ou par quantité pour un snack), noms darija, glisser-déposer dans le programme. — 🚧 Partiel (bibliothèque, variantes et
noms faits ; **glisser-déposer** et plat réparti sur plusieurs jours à faire)
**US-12.5** (P1) — Je colle la liste WhatsApp de la femme de ménage (arabe, sous-totaux
reconnus) et le programme de la semaine ; je recopie la liste précédente. — 🚧 Partiel
(collage de la liste et du programme fait ; recopie de la liste précédente à faire)
**US-12.8** (P1) — Je suis averti quand un plat prévu a des ingrédients absents de la
liste de courses (contrôle de couverture), et je peux obtenir une proposition de liste
depuis le programme. — ✅ Fait
**US-12.6** (P2) — Suivi des dépenses : paiements de courses par point de vente (plusieurs
paiements possibles chez le même), prix par article facultatif, honoraires à 200 MAD par
jour travaillé. — 🚧 Partiel (saisie et totaux par semaine faits ; histogramme, vue mensuelle
et carte tableau de bord à faire)
**US-12.7** (P2) — Retour 👍/👎 (avec remarque) sur chaque plat préparé, statistiques par
plat (servi N fois, 👍/👎, tri « mieux notés »), message de fin de semaine à la personne de
ménage, bienveillant et modifiable avant envoi. — ✅ Fait

**US-12.9** (P1) — En faisant les courses, je vois la liste d'un point de vente, je coche
ce qui est servi, je saisis le montant payé à la fin, et je vois à tout instant ce qui a
été acheté et ce qui reste. — ✅ Fait
**US-12.10** (P2) — Quand un jour n'a pas de snack, il reprend ceux du dernier jour non
vide, sans duplication des données. — ✅ Fait
**US-12.11** (P2) — Les plats et articles déjà saisis alimentent un référentiel
(autocomplétion, point de vente et quantité habituels). — ✅ Fait
**US-12.12** (P1) — Je renseigne pour un plat les ingrédients pour 2, 3, 4 ou 5
personnes, et pour un snack ceux d'une quantité donnée (« 10 petites pizzas »), sans que
cela soit obligatoire pour utiliser la liste de courses. — ✅ Fait (saisie ; l'usage des
variantes pour proposer la liste est à l'étape 3)

**US-12.13** (P1) — Quand je paie un point de vente alors qu'il reste des articles non
pris, ceux-ci passent dans un 2e passage chez ce point de vente, pour garder les
paiements séparés. — ✅ Fait
**US-12.14** (P1) — Je corrige et je traduis (à la main, ou avec des suggestions à
vérifier) un plat du programme, un article de courses ou un plat de la bibliothèque. — ✅ Fait
**US-12.15** (P2) — Je vois le programme de la semaine en calendrier à trois colonnes,
comme le cahier. — ✅ Fait

**US-12.16** (P1) — J'envoie à chaque commerçant, sur WhatsApp, uniquement ce qu'il reste à
acheter chez lui (sans prix ni statut), et à la personne de ménage le programme ou la
liste complète. Le bouton d'envoi est sur sa propre ligne, visible sur téléphone. — ✅ Fait
**US-12.17** (P1) — Une traduction saisie une fois vaut pour tous les noms identiques
(jours répétés, autres semaines, bibliothèque, courses), sans retraduire ni retaper ; la
traduction déjà connue est proposée en premier. — ✅ Fait
**US-12.18** (P1) — Les textes arabes longs (plat + traduction) passent à la ligne au lieu
de déborder ; le calendrier défile horizontalement avec des flèches, jours figés, l'arabe
sur une ligne et le français dessous. — ✅ Fait

**US-12.19** (P1) — Je marque chaque plat/snack du programme comme préparé ou non préparé
(avec un motif : pas le temps, ingrédient manquant, ou sans motif), pour suivre la
réalisation réelle, et je filtre le programme (tout / planifié / préparé / non préparé)
en liste comme en calendrier. Prérequis du retour 👍/👎 (US-12.7), qui ne portera que sur
les plats réellement préparés. — ✅ Fait

**US-12.20** (P1) — Le statut (préparé / non préparé) est à gauche du plat et la
suppression à droite, en rouge, avec confirmation avant de supprimer, pour éviter les
suppressions par erreur. — ✅ Fait
**US-12.21** (P2) — Je précise la quantité préparée d'un snack (ex. 10 petites pizzas),
qui choisira la variante d'ingrédients. — ✅ Fait

**US-12.22** (P2) — Je marque des ingrédients « en stock » (sel, huile…) pour qu'ils ne
soient jamais signalés comme oubliés, et je peux les remettre à contrôler. — ✅ Fait

**US-12.23** (P1) — Le 👍/👎 est par personne : chacun voit le nombre de votes positifs et
négatifs entre parenthèses, ne vote qu'une fois, un second clic sur le même pouce annule
son vote, et pour changer d'avis il doit d'abord annuler. — ✅ Fait

**US-12.24** (P1) — Je choisis d'envoyer le programme ou la liste en texte, ou en tableau
(image PNG : jours × repas pour le programme, un bloc par point de vente pour la liste),
via la feuille de partage du téléphone (WhatsApp) ou en téléchargement. — ✅ Fait

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
