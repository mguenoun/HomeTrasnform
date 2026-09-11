# Spécification fonctionnelle — HomeTransform

## 1. Rôles et accès
- Un seul rôle : membre de la famille, connecté via Google Sign-In.
- Accès réservé aux emails inscrits dans la liste des membres autorisés (ajout manuel
  via Firestore au démarrage, pas d'auto-inscription).
- Toute personne connectée peut créer/modifier/affecter/clore n'importe quelle tâche ou
  objectif, et supprimer n'importe quelle pièce jointe (y compris uploadée par un autre
  membre) — pas de granularité de droits en v1.

## 2. Écrans principaux

### 2.1 Connexion
- Bouton "Se connecter avec Google".
- Si l'email connecté n'est pas dans la liste autorisée → message d'erreur explicite,
  déconnexion automatique.

### 2.2 Tableau de bord (accueil)
- Vue synthétique par objectif : % d'avancement (tâches terminées / total), budget
  engagé vs dépensé.
- Liste des tâches "à faire cette semaine" (dueDate proche) et "bloquées".
- Filtre rapide par membre ("mes tâches").

### 2.3 Liste des objectifs
- Carte par objectif : titre, description, date cible, statut, barre de progression,
  budget total.
- Créer / éditer / archiver un objectif.

### 2.4 Détail d'un objectif
- Infos de l'objectif + liste des tâches rattachées (filtrable par statut/type/assigné).
- Bouton "Ajouter une tâche à cet objectif".

### 2.5 Liste des tâches (vue globale, tous objectifs confondus + tâches libres)
- Filtres : type (ménage / travaux / achat / sous-traitance), statut, pièce, assigné,
  objectif.
- Tri par priorité, échéance, budget.

### 2.6 Détail d'une tâche
- Champs : titre, description, type, pièce, priorité, statut, assignés, échéance,
  budget estimé/réel, objectif rattaché.
- Bloc pièces jointes : liste des fichiers (nom, type, taille, uploadé par, date),
  upload multi-fichiers, suppression (par tout membre), aperçu/téléchargement.
- Bloc commentaires : fil chronologique, ajout de commentaire texte.
- Historique des changements de statut (au minimum : qui a clos, quand).

### 2.7 Vue budget
- Total engagé (somme des budgets estimés) vs dépensé (somme des budgets réels) sur
  tâches non annulées.
- Regroupement par objectif et par type de tâche.
- Mise en évidence des dépassements (réel > estimé).

## 3. Règles métier

**Statuts de tâche** : `à faire → en cours → terminé`, avec état parallèle `bloqué`
(peut être atteint depuis "à faire" ou "en cours", et en sortir vers "en cours").
- Passage à "terminé" fige budgetActual (dernière valeur saisie) et horodate la clôture.

**Budget** :
- budgetEstimated obligatoire seulement si type = achat ou sous-traitance (facultatif
  sinon, ex: ménage n'a généralement pas de budget).
- budgetActual saisi librement, à tout moment, éventuellement partiel (acompte).

**Affectation** :
- Une tâche peut avoir 0 (non affectée), 1 ou plusieurs assignés.
- Tout membre peut s'auto-affecter ou affecter un autre membre.

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
2. **Gérer un achat/sous-traitance** : créer une tâche type achat → saisir budget
   estimé → uploader un devis → une fois validé, mettre à jour budget réel + facture →
   clore.
3. **Suivi hebdo familial** : ouvrir le tableau de bord → voir "mes tâches" et les
   tâches bloquées → mettre à jour statuts/commentaires.

## 5. Non-fonctionnel
- Responsive mobile-first (usage probable sur téléphone en magasin/pendant les
  travaux).
- Temps réel : une modification par un membre est visible par les autres sans
  rafraîchissement manuel.
- Pas de mode offline en v1 (nécessite connexion).
