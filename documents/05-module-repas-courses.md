# Brief — Module « Repas & Courses »

> Statut (2026-11-21) : brief validé. **Étape 1 livrée en code** (programme, liste de
> courses manuelle, envoi WhatsApp) — voir `04-user-stories.md` Epic 12. Étapes 2 à 5
> à venir.
> Ce module est **indépendant** du triptyque objectifs / tâches / budgets
> (`01-product-brief.md`) : ceux-ci pilotent des projets à moyen/long terme, celui-ci
> pilote un **rythme hebdomadaire récurrent**.

## 1. Vision

Chaque semaine, la famille décide *ce qu'on mange*, l'application en déduit *ce qu'il faut
acheter*, la personne qui assure le ménage et la cuisine sait *quoi préparer et quoi
acheter*, et la famille voit *ce que ça coûte* (courses + honoraires).

Boucle cible, ~10 minutes par semaine :

```
Référentiel (plats, ingrédients)
        │ glisser-déposer
        ▼
Programme de la semaine (7 jours × 4 créneaux)
        │ génération automatique
        ▼
Liste de courses (auto + lignes manuelles, cochable en magasin)
        │ achat
        ▼
Dépenses (ticket de courses, honoraires)  →  suivi hebdo / mensuel
```

## 2. Utilisateurs et rôles

| Qui | Besoin | Droits |
|---|---|---|
| Membres de la famille | Construire le programme, gérer le référentiel, voir les dépenses | Lecture/écriture (comme le reste de l'app) |
| Personne qui fait le ménage / la cuisine | Recevoir le programme et la liste de courses | **Aucun accès à l'app** (décision 2026-11-21) : elle les reçoit par WhatsApp, en arabe darija |

## 3. Fonctionnalités

### 3.1 Référentiel (bibliothèque)
- **Plats** : nom, catégorie (plat, salade, snack, dessert, boisson…),
  notes de préparation (texte libre, photo facultative), favori.
- **Quantités par variantes, pas par multiplication** (décision 2026-11-21) : les
  quantités ne sont pas proportionnelles au nombre de convives, donc chaque plat porte
  **une liste d'ingrédients propre à chaque taille définie** :
  - plat / salade / dessert : variantes **pour 2, 3, 4, 5 personnes** (on n'en définit
    que celles qu'on veut) ;
  - snack : variantes **par quantité produite** dans l'unité du snack (ex. « 10 petites
    pizzas » : unité = « petite pizza », variantes 10, 20…).
  Chaque variante = liste d'**ingrédients élémentaires** (ingrédient + quantité + unité).
  Gain de saisie : « Copier depuis la variante 4 » pré-remplit une autre taille, qu'on
  corrige ensuite.
- **Ingrédients** : nom, unité par défaut (kg, g, L, pièce, botte…), rayon (fruits &
  légumes, boucherie, épicerie…) pour ordonner la liste en magasin, prix indicatif
  facultatif (sert à estimer le coût d'une semaine).
- Création **à la volée** : depuis le programme, taper un nom inconnu crée un plat
  « sans recette » (saisie simple) qu'on pourra détailler plus tard. Le référentiel
  n'est donc jamais un prérequis bloquant.
- **Référentiel initialisé par l'usage** (🚧 livré 2026-11-22, sans écran de gestion) :
  chaque plat saisi ou importé dans le programme est mémorisé (`dishes`, avec les
  drapeaux « déjà planifié comme snack / comme repas »), chaque article ajouté ou importé
  dans la liste l'est aussi (`ingredients`, avec son dernier point de vente et sa
  dernière quantité). Ils alimentent l'**autocomplétion** et, pour un article connu,
  pré-remplissent point de vente et quantité. Clé = libellé normalisé (casse, accents,
  hamza, voyelles brèves), donc « الأحد » et « الاحد » ne font qu'un. **Bibliothèque** (✅ livré
  2026-11-22) : onglet dédié, liste des plats (recherche arabe/français, mention
  « sans ingrédients » pour ceux qu'on n'a pas encore détaillés) et éditeur : nom +
  traduction, type *plat* (tailles en personnes, 2/3/4/5 proposées + taille libre) ou
  *snack* (tailles en unités, avec le nom de l'unité), **ingrédients propres à chaque
  taille** (nom + quantité libre, avec autocomplétion), « Copier depuis… » une autre
  taille, renommage (le document change de clé pour éviter les doublons), suppression
  avec confirmation. Les tailles sans ingrédient ne sont pas enregistrées. **Rien n'est
  obligatoire** : la liste de courses globale reste saisie ou collée indépendamment des
  plats. *Reste à faire* : choix de la variante selon convives/quantité et proposition
  de liste, contrôle de couverture (étape 3), plat réparti sur plusieurs jours.

### 3.2 Programme hebdomadaire
- Grille **7 jours × 3 créneaux**, comme le cahier de la famille (révisé 2026-11-22) :
  **snacks (petit-déj & goûter)**, déjeuner, dîner. Les snacks sont préparés en
  quantité pour quelques jours et servent indifféremment au petit-déjeuner ou au goûter,
  d'où une seule colonne.
- **La semaine commence le samedi** (`WEEK_STARTS_ON`). Une semaine est identifiée par
  la **date de son premier jour** (`2026-11-21`), pas par un numéro de semaine ISO.
- **Saisie en arabe ou en français** : le nom est saisi dans la langue de l'utilisateur,
  avec une traduction facultative dans l'autre (voir 3.5). Un repas composé se saisit
  « couscous + salade » et est découpé en éléments sur le « + ».
- **Plat réparti sur plusieurs jours** (cake mardi-mercredi, baghrir jeudi-vendredi,
  grande pizza/quiche/tarte pour plusieurs jours, ou petites portions individuelles) :
  un snack est **préparé une fois** pour plusieurs créneaux. À modéliser avec le
  référentiel (étape 2) : un élément couvre une plage de jours et ses ingrédients ne sont
  comptés qu'**une fois**.
- **Snacks d'un jour vide reportés** (✅ livré 2026-11-22) : un jour sans snack reprend
  ceux du premier jour non vide qui le précède dans la semaine (le cake du mardi sert
  encore le mercredi). Le report est **calculé à l'affichage et dans le message**
  (« suite »), jamais copié dans les données : le snack n'est saisi qu'une fois, ses
  futurs ingrédients ne seront comptés qu'une fois, et saisir un snack le jour même
  remplace le report. Ne remonte pas avant le début de la semaine.
- Un créneau contient **0..n éléments** (ex. déjeuner = plat + salade), chacun avec un
  même **nombre de convives (`diners`) défini par repas** (défaut = valeur de la
  semaine, modifiable créneau par créneau : « dîner à 8 samedi »). Pour un **snack**,
  on indique à la place la **quantité** voulue (« 10 petites pizzas »), propre à
  l'élément. Ce nombre sélectionne la variante d'ingrédients (voir 3.1 et 4.4).
- **Glisser-déposer** : de la bibliothèque vers un créneau, entre créneaux, copie d'un
  jour/d'une semaine entière (« reprendre la semaine dernière »). Alternative tactile
  obligatoire : **tapote un créneau → choisis un plat** (le drag & drop sur mobile en PWA
  est fragile, il ne doit jamais être le seul chemin).
- Saisie libre toujours possible (« restes », « resto », « invités »).
- Navigation semaine précédente / suivante, semaine commençant le lundi.
- **Partage WhatsApp** (décision 2026-11-21) : un bouton génère un texte formaté du
  programme et de la liste de courses, ouvert via `https://wa.me/?text=...` (aucune API,
  aucun backend). Le texte est **bilingue** (voir 3.5).

### 3.3 Liste de courses

**Contexte réel (2026-11-22)** : la personne de ménage établit la liste d'ingrédients à
partir du programme et l'envoie sur WhatsApp, en vrac. Le propriétaire la **retrie par
point de vente** (boucher, épicier, volailler, fruits et légumes, herbes, œufs…) pour
optimiser sa tournée, et chaque point de vente est **payé séparément**. Le défaut
principal est **l'oubli** : un ingrédient manquant (ex. le cha3ria) et le plat prévu
n'est pas préparé. La valeur n°1 du module est donc **ne rien oublier**, plus que
calculer des quantités.

Deux façons d'obtenir la liste, qui **coexistent** :
- **A. Saisie / collage d'une liste globale** (celle de WhatsApp, en arabe, avec quantités
  libres : « 5 دراهم كمون », « ربعة زبدة », « باكية », « كيلو و نصف ») : import par
  collage, une ligne = un article, les sous-totaux (« 361dh ») reconnus comme montant du
  groupe qui précède.
- **B. Proposition inférée** depuis les ingrédients de chaque plat/snack (référentiel,
  variantes — voir 3.1), pour fiabiliser.
- **C. Contrôle de couverture (le cœur de la fiabilisation)** : comparer la liste (A) au
  programme + référentiel (B) et signaler les plats dont des ingrédients n'apparaissent
  pas dans la liste (« Dîner de samedi : شعرية manquante »). Un plat sans ingrédients
  définis est signalé « à vérifier » plutôt que d'être ignoré en silence.

**Mode courses par point de vente** (✅ livré 2026-11-22) : on fait ses achats point de
vente par point de vente. Chaque groupe affiche « n/m pris », on coche les articles
servis, et un bouton « Payer {point de vente} » saisit le **montant payé** à la fin
(pré-rempli avec la somme des prix d'articles saisis, modifiable). Un en-tête donne à
tout instant « X achetés · Y restants » avec une barre d'avancement, et « Masquer ce qui
est pris » ne laisse voir que le reste. Un article non trouvé reste « à acheter » même
après le paiement du point de vente (cas du lait et du yaourt, payés plus tard ailleurs).

**Passages multiples chez un même point de vente** (✅ livré 2026-11-22) : un même point
de vente peut être visité plusieurs fois, chaque passage ayant son propre paiement. Quand
on paie un passage alors que des articles ne sont pas pris, ces articles passent
automatiquement au **passage suivant** (« Épicier — 2e passage »), et le paiement est
enregistré **dans la même écriture atomique** (jamais un paiement sans report). Dans une
liste collée, un point de vente qui revient devient un passage 2. Le total par point de
vente (onglet Dépenses) cumule tous ses passages ; changer l'article de point de vente le
remet au passage 1.

**Points de vente** : chaque article porte un point de vente (liste par défaut éditable,
saisie libre) ; la liste s'affiche et s'envoie **groupée par point de vente**, avec le
**montant payé** par point de vente (alimente les dépenses, étape 4). L'application
retient le point de vente habituel d'un article pour le proposer la fois suivante.

**Recopier la liste de la semaine précédente** (articles non cochés ou habituels) pour
éviter de tout ressaisir — le réassort du placard (huile, farine, levure, épices)
revient chaque semaine.

- **Génération automatique** : somme des ingrédients de la variante retenue pour chaque
  élément du programme (voir 4.4), regroupés par ingrédient + unité, classés par rayon.
  Les lignes issues d'une taille **approchée** (aucune variante exacte) sont signalées
  « à vérifier ».
- **Lignes manuelles** (produits ménagers, hors-recette, « piles ») ajoutables à tout
  moment ; une liste peut aussi être **100 % manuelle** (le programme n'est pas requis).
- **Régénération non destructive** : modifier le programme met à jour les lignes
  automatiques, sans effacer les lignes manuelles, les cases déjà cochées ni les
  quantités ajustées à la main (une ligne porte son origine : `auto` ou `manual`, et un
  indicateur « ajustée »).
- **Garde-manger (v2)** : ingrédients « toujours en stock » (sel, huile…) exclus de la
  génération, ou quantité en stock à déduire.
- Cases à cocher en temps réel (la famille et la personne en magasin voient la même
  liste, comme le reste de l'app via `onSnapshot`), prix réel par ligne facultatif.

### 3.4 Dépenses
**Séparées des budgets existants** (décision 2026-11-21) : les rubriques budgétaires
restent réservées aux chantiers/projets. Deux types, une seule saisie simple (date, montant MAD, note, photo du ticket
facultative) :
- **Courses** : un paiement = **point de vente + montant + date**, rattaché à une
  semaine. **Prévu ≠ payé** (décision 2026-11-22) : l'article porte le point de vente
  *prévu* ; les paiements sont des enregistrements séparés. Un même point de vente peut
  donc donner **plusieurs paiements** (cas réel : lait et yaourt non trouvés chez le
  premier épicier, payés plus tard ailleurs, 26 MAD) ; le total du point de vente est
  leur somme. Le **prix par article** reste possible mais **facultatif** (détail, jamais
  la source de vérité : on affiche « détail articles » à côté du payé sans les imposer
  égaux).
- **Honoraires** : un **paiement daté** (date, montant, note) — décision 2026-11-21 ;
  pas de suivi par heure. La personne de ménage est payée **200 MAD par jour travaillé**
  (en général samedi, mardi, jeudi) : le formulaire pré-remplit 200 MAD, modifiable.
  *Idée non faite* : rappeler les jours habituels sans paiement saisi.
- Vues : total de la semaine / du mois, répartition courses vs honoraires, histogramme
  hebdomadaire. **Réutiliser** `formatMad` (`src/domain/money.ts`), la logique de
  paiements datés (`src/domain/payments.ts`) et l'histogramme déjà livré sur la fiche
  objectif.
- Écart optionnel : budget courses hebdomadaire cible vs réel.

### 3.5 Bilinguisme français / arabe darija
- Chaque **plat** et chaque **ingrédient** porte un nom français (`name`) et un nom en
  darija (`nameAr`, facultatif, écriture arabe). Il est saisi **une seule fois** dans le
  référentiel puis réutilisé partout : le référentiel a donc de la valeur même sans
  recettes détaillées.
- Le message WhatsApp affiche les deux langues (`Poulet rôti — دجاج مشوي`), avec repli
  sur le français si `nameAr` est vide. Les libellés fixes (jours, repas, rayons) sont
  traduits en dur dans `domain/`.
- Aide à la saisie : bouton « Suggérer la traduction » via un **service gratuit**,
  résultat toujours **validé/corrigé** par un membre de la famille avant enregistrement.
  Réserves à connaître :
  - L'API officielle Google Cloud Translation est **payante** (quota gratuit limité,
    carte bancaire requise) ; l'endpoint web « gratuit » de Google n'est pas une API
    supportée (ToS, peut casser ou être bloqué sans préavis) : à éviter.
  - Les services gratuits pour un petit volume (ex. MyMemory, ou LibreTranslate
    auto-hébergé) existent, mais ils produisent surtout de l'**arabe standard**, pas
    du darija marocain (`ويسخن` vs `كايسخن`…). Pour des noms de plats et d'aliments, le
    résultat est souvent acceptable, parfois non (noms de plats marocains).
  - Parade complémentaire : **dictionnaire de départ** (une centaine de plats et
    d'aliments courants avec leur nom darija) fourni avec l'app, qui évite l'appel
    réseau pour les cas fréquents. Les noms ne sont pas des données personnelles, aucun
    souci de confidentialité à les envoyer à un service tiers.
  - Le choix du service se fait après un essai sur des exemples réels (décision 7).
  - Alternative payante mais meilleure sur le darija : API Claude via le Worker
    (clé et coût à gérer) — hors v1.
- **Correction et traduction (✅ livré 2026-11-22)** : tout plat du programme (tap sur
  son nom), tout article de courses (✎) et tout plat de la bibliothèque se corrige et
  se traduit à la main. Un bouton **« Suggérer »** interroge le service gratuit MyMemory
  (sans clé, seul le nom est envoyé). Résultats **à vérifier** : le service s'appuie en
  partie sur des sous-titres, sa première réponse est souvent du bruit (« Oh, mon
  Dieu… » pour « طماطم »), donc on filtre (phrases, questions, longueur) et on classe les
  trois meilleures propositions, qu'on choisit ; rien n'est écrit sans enregistrement
  explicite. Bonne pour les mots courants (français vers arabe surtout), mauvaise pour le
  vocabulaire marocain (taqtaa, tefal…). Pas de traduction « en masse » automatique : une
  traduction non relue ne doit pas partir dans un message WhatsApp.
- **Traduction partagée (✅ livré 2026-11-22)** : une traduction appartient au **nom**,
  pas à l'endroit où il apparaît. Elle s'écrit dans le référentiel (`dishes` pour les
  plats, `ingredients` pour les articles) et se retrouve partout où ce nom apparaît
  (programme, calendrier, messages WhatsApp, courses, autres semaines) : on ne retraduit
  pas un snack qui se répète, ni dans le programme et la bibliothèque à la fois. La
  traduction déjà connue est proposée en premier et pré-remplie ; effacer une traduction
  se fait dans le référentiel. Les anciennes traductions portées par un élément restent
  lues en repli.
- **Partage WhatsApp (✅ livré 2026-11-22)** : le bouton d'envoi du programme ou de la
  liste complète est sur sa **propre ligne** sous les onglets ; chaque point de vente a
  son bouton « Envoyer sur WhatsApp » qui n'envoie que les articles **non pris** chez lui
  (nom, traduction, quantité — ni prix ni statut). *Pas encore* : numéro de téléphone
  mémorisé par commerçant pour ouvrir directement la bonne conversation.
- **Vue calendrier (✅ livré 2026-11-22)** : en plus du détail jour par jour, le
  programme s'affiche comme le cahier (un jour par ligne, trois colonnes) ; les snacks
  reportés y sont en italique et un tap sur un jour ouvre son détail.
- Texte arabe en RTL : `dir="auto"` dans l'interface, et tests sur l'ordre mixte FR/AR
  dans le message généré.
- L'interface de l'app reste en français (les utilisateurs sont la famille).

### 3.3 bis Contrôle des oublis (✅ livré 2026-11-22)
En tête de l'onglet Courses : pour chaque plat **encore planifié** (ni préparé ni non
préparé), l'app compare les ingrédients de sa recette à la liste et signale ce qui manque
(« Samedi · Dîner — شعرية الحليب (4 p.) : شعرية »). Boutons **Ajouter** (avec la quantité de
la recette et le dernier point de vente connu), **Ajouter tout ce qui manque** (c'est la
« proposition de liste depuis le programme », non destructive : elle n'ajoute que les
absents) et **En stock**.
- **Taille de la recette** (`resolveVariant`) : variante exacte ; sinon **combinaison** de
  variantes (6 = 4 + 2, 8 = 4 + 4, 30 pizzas = 3 × 10, en privilégiant le moins de parts) ;
  sinon la variante la plus proche **mise à l'échelle**, marquée « taille estimée, à
  vérifier ». Convives du repas pour un plat, quantité saisie pour un snack « par unités »
  (à défaut, plus petite recette, estimée).
- **Comparaison des noms** : insensible à la casse/accents/hamza ; un nom contenu dans un
  autre (≥ 3 lettres) correspond (« طحين » ~ « طحين فينو ») ; comparaison **dans les deux
  langues** grâce aux traductions connues.
- **Un plat sans recette n'est jamais ignoré en silence** : il est listé comme « non
  contrôlé ».
- **Garde-manger** : un ingrédient « en stock » n'est plus signalé (collection `pantry`,
  réversible).
- Limites connues : additionner deux variantes peut sur-estimer un ingrédient non
  proportionnel (épice, fond de cuisson) ; la correspondance par inclusion peut, rarement,
  confondre deux noms voisins (le cas se corrige en mettant l'ingrédient en stock ou en
  l'ajoutant explicitement).

### 3.5 bis Suivi de réalisation (✅ livré 2026-11-22)
La personne de ménage peut ne pas avoir le temps (tarte aux pommes) ou les ingrédients
(cha3ria) : chaque plat/snack du programme a un **statut** — *planifié* (par défaut),
*préparé* ou *non préparé* (avec un **motif** : « Pas le temps », « Ingrédient manquant »,
ou sans motif). Marquage au tap (✓ / ✗ sur la pastille), « Tout préparé » par créneau. Une
**vue filtrée** (Tout / Planifié / Préparé / Non préparé, avec compteurs) s'applique à la
liste et au calendrier ; sous un filtre la saisie est masquée (on consulte) et les index
d'origine sont conservés pour ne jamais modifier un autre plat. Les messages WhatsApp
repèrent ✅ / ❌ (et le motif). Le statut d'un snack reporté est celui de son jour d'origine
(un seul élément, saisi une fois). Le report se recalcule sur le programme filtré.
*Suite logique* : le retour 👍/👎 ne s'affichera que sur les plats **préparés** ; un plat
non préparé faute d'ingrédient alimentera le contrôle de couverture (étape 3).

### 3.6 bis Retours livrés (✅ 2026-11-22)
- **Disposition** : statut ✓ / ✗ à **gauche** du plat, suppression × à **droite**, en
  rouge, avec **confirmation** (« Supprimer « X » du programme ? ») — la confirmation et le
  choix du motif ne s'ouvrent jamais ensemble.
- **Retour** 👍 / 👎 (+ remarque facultative, enregistrée en quittant le champ) uniquement sur un
  plat **préparé** ; un second appui sur le même pouce l'efface ; repasser le plat à
  « planifié » ou « non préparé » efface son retour.
- **Statistiques par plat** (bibliothèque) : servi N fois, 👍/👎, tri « mieux notés » / « plus
  servis ». Calculées à la lecture sur **toutes les semaines** (un document par semaine),
  donc rien à maintenir ni à dénormaliser ; seuls les plats *préparés* comptent.
- **Message de fin de semaine** : pré-rempli (remerciements, « très appréciés », « à
  améliorer » avec remarque, « pas préparés » avec motif), **sans note chiffrée**, modifiable
  avant l'envoi WhatsApp. Les titres arabes sont à faire relire.
- **Quantité d'un snack** (ex. 10 petites pizzas) saisie dans l'édition de la pastille :
  elle choisira la variante d'ingrédients au contrôle des oublis.

### 3.6 Retours sur les repas
- Après un repas, un membre de la famille indique s'il a été **apprécié** : 👍 / 👎
  (décision 2026-11-21, pas d'étoiles), avec un commentaire facultatif (« trop salé », « les enfants ont adoré »). Un tap sur le repas du programme.
- **Notation du plat** dans la bibliothèque : taux d'appréciation / note moyenne et
  nombre de fois servi, tri « les mieux notés », filtre favoris. Aide à composer les
  semaines suivantes.
- **Retour de fin de semaine** : un bouton génère un message WhatsApp bilingue pour la
  personne de ménage, qui résume la semaine (plats très appréciés, remarques), rédigé
  automatiquement à partir des retours puis **modifiable avant envoi**. Ton prévu :
  remerciements + points d'amélioration, sans note chiffrée brute.
- Un retour porte sur un repas d'une semaine donnée (stocké dans le programme, voir 4.3),
  pas sur le plat en général : un même plat peut être réussi une semaine et raté la
  suivante.

## 4. Intégration à l'application

### 4.1 Principe : module autonome, même socle
Même stack, mêmes conventions (`domain/` pur et testé, `services/` Firestore, `hooks/`
`onSnapshot`, `pages/`), aucune dépendance vers objectifs/tâches/budgets. Accès familial
unique via `isFamilyMember()`, **pas de notion de privé** ici (donc aucun risque du
piège `get()` + requêtes de liste décrit dans `CLAUDE.md`).

### 4.2 Navigation
- Nouvelle entrée dans la barre de navigation : **« Repas »**, avec trois onglets :
  *Semaine* (programme + glisser-déposer), *Courses* (liste), *Bibliothèque*
  (plats & ingrédients), plus *Dépenses*.
- Tableau de bord : une carte « Cette semaine » (repas du jour, avancement de la liste
  de courses, dépenses de la semaine). Facultatif en v1.

### 4.3 Modèle de données Firestore (proposé)

| Collection | Contenu | Remarque |
|---|---|---|
| `ingredients/{id}` | `name`, `defaultUnit`, `aisle`, `unitPrice?` | catalogue |
| `dishes/{id}` | `name`, `nameAr?`, `category`, `basis` (`persons`/`units`), `unitLabel?` (ex. « petite pizza »), `variants: [{ n, ingredients: [{ingredientId, qty, unit}] }]`, `notes?`, `favorite` | variantes **embarquées** (toujours lues avec le plat). `n` = nb de personnes (2, 3, 4, 5…) ou nb d'unités (10…) |
| `mealPlans/{weekId}` | `weekId` (`2026-W47`), `defaultDiners`, `slots: { "mon.lunch": { diners, items: [{dishId?, label, labelAr?, n?, feedback?}] }, … }` | **un document par semaine** → un seul `onSnapshot`, écriture atomique à chaque drop. `diners` = convives du repas ; `n` = quantité d'un snack (si `basis = units`) ; `feedback` = `{ thumb: 'up'\|'down', comment? }` posé après coup |
| `shoppingLists/{weekId}` | `items: [{id, name, qty, unit, aisle, origin, checked, adjusted, price?}]` | un document par semaine ; `weekId` = clé naturelle |
| `householdExpenses/{id}` | `type` (`groceries`/`helper`), `amount`, `date`, `weekId`, `note`, `createdBy`, pièce jointe | réutilise le mécanisme de pièces jointes existant |

Points d'attention :
- Plafond Firestore de 1 MiB par document : sans objet à cette échelle.
- `weekId` en ISO-8601 (semaine commençant le lundi) calculé dans `domain/`, avec tests
  (années à 53 semaines, passage d'année).
- Pas de champ de visibilité, pas de `get()` inter-documents dans les règles → règles
  limitées à `isFamilyMember()` par collection (+ test d'émulateur `getDocs()` sans filtre,
  par discipline, même si le risque est nul ici).
- Le plat copie son nom (`label`, `labelAr`) dans le créneau : renommer/supprimer un
  plat du référentiel ne casse pas les semaines passées ni les messages déjà générés.
- Plus de formule proportionnelle : les quantités viennent de la **variante** du plat
  correspondant au nombre demandé (voir 4.4).
- La note moyenne d'un plat est **calculée** à partir des `feedback` des semaines
  (pas de champ dénormalisé à maintenir en v1).

### 4.4 Logique métier (couche `domain/`, 100 % testable sans Firebase)
- `weekId` / dates de la semaine.
- `resolveVariant(dish, n)` : choisit les ingrédients pour `n` personnes/unités.
  Règle proposée, dans cet ordre :
  1. variante **exacte** (`n` défini) → utilisée telle quelle ;
  2. sinon **combinaison de variantes** dont la somme vaut `n` (ex. 6 = 4 + 2, 8 = 4 + 4,
     7 = 5 + 2) → ingrédients additionnés ; on préfère les plus grandes variantes ;
  3. sinon **proportionnel** à partir de la variante la plus proche, résultat marqué
     `approx` (« à vérifier »).
  Pour un snack, même règle sur `n` unités (30 = 3 × 10, 15 → proportionnel depuis 10).
  Plat sans aucune variante (saisie simple) → aucune ligne générée, l'utilisateur
  complète la liste à la main.
  *Limite connue* : additionner deux variantes peut sur-estimer des ingrédients non
  proportionnels (une épice, un fond de cuisson) ; d'où l'usage prioritaire d'une
  variante exacte, et la possibilité de corriger la quantité dans la liste.
- `buildShoppingList(plan, dishes, ingredients, pantry?)` : agrégation des variantes
  retenues, **normalisation d'unités** (g↔kg, mL↔L ; pas de conversion
  volume↔masse — deux unités incompatibles pour un même ingrédient restent deux lignes).
- `mergeShoppingList(existing, generated)` : fusion préservant manuel / coché / ajusté.
- Totaux de dépenses par semaine/mois/type.

### 4.5 Glisser-déposer
Aucune bibliothèque de DnD aujourd'hui dans `package.json`. Recommandation :
**`@dnd-kit`** (tactile, accessible clavier, maintenu) avec capteur tactile à appui long,
plus le chemin « tap → choisir ». À valider sur iPhone en PWA installée *avant* de
construire tout l'écran (prototype de 1/2 journée).

### 4.6 Notifications (réutilise le Worker existant)
Rappel hebdomadaire optionnel : « Le programme de la semaine n'est pas planifié »
(dimanche soir), « Liste de courses prête ». Nécessite une modification du dossier
`worker/` → à signaler comme *code modifié, à déployer manuellement*. **Hors v1.**

## 5. Phasage proposé (livrable indépendamment)

1. **Fondations + saisie simple** — ✅ livré en code. Règles Firestore, semaine du samedi,
   programme hebdo en saisie libre (3 créneaux, « A + B »), liste de courses manuelle
   cochable **groupée par point de vente avec montant payé**, envoi WhatsApp.
1b. **Import et dépenses** — ✅ livré en code (2026-11-22) : collage d'une liste WhatsApp
   (arabe, quantités libres, sous-totaux reconnus, points de vente et montants
   confirmés avant écriture), collage du programme, paiements courses/honoraires avec
   prix par article facultatif. *Reste* : recopie de la liste précédente, point de vente
   habituel mémorisé par article.
2. **Référentiel + glisser-déposer** — plats, ingrédients, drop dans la grille,
   copie de semaine, plat réparti sur plusieurs jours, noms arabe/français.
3. **Proposition de courses et contrôle de couverture** — liste proposée depuis le
   programme (variantes), et **détection des ingrédients oubliés** par comparaison avec
   la liste saisie. Prioritaire sur la génération « automatique » complète : la liste
   réelle mélange besoins des repas et réassort, elle ne se déduit pas entièrement du
   programme.
4. **Dépenses** — courses et honoraires, totaux et histogramme, carte tableau de bord.
5. **Retours sur les repas** — 👍/👎 par repas, note moyenne par plat, message de
   retour de fin de semaine.
6. *(Plus tard)* garde-manger, estimation de coût d'une semaine, rappels push,
   rôle « aide » restreint.

## 6. Stories (toutes ⬜ Prévu)

- Je planifie la semaine en posant des plats dans les créneaux jour × repas.
- Je saisis un repas en texte libre sans passer par le référentiel.
- Je constitue un référentiel de plats avec leurs ingrédients élémentaires.
- Je copie la semaine précédente comme point de départ.
- Je colle la liste WhatsApp de la femme de ménage et je la retrouve classée par point de vente.
- Je suis averti si un plat prévu a des ingrédients absents de la liste (ex. cha3ria oublié).
- Je recopie la liste de la semaine précédente.
- Je génère une proposition de liste depuis le programme, puis j'y ajoute des lignes à la main.
- Je coche les articles achetés depuis mon téléphone, la famille le voit en direct.
- Je saisis le montant d'un ticket de courses et le paiement de la personne de ménage.
- Je vois le total dépensé par semaine et par mois, courses vs honoraires.
- J'envoie en un tap le programme et la liste de courses, en français + darija, sur WhatsApp.
- Je renseigne une fois pour toutes le nom darija d'un plat ou d'un ingrédient.
- Je définis pour un plat les ingrédients pour 2, 3, 4 ou 5 personnes, et pour un snack
  ceux d'une quantité donnée (10 petites pizzas).
- Je précise le nombre de convives de chaque repas (ou la quantité d'un snack) et la
  liste de courses retient les bons ingrédients.
- J'indique après un repas si on a aimé (👍/👎, commentaire facultatif).
- J'envoie en fin de semaine un retour à la personne de ménage sur WhatsApp.
- Je retrouve mes plats les mieux notés pour composer la semaine suivante.

## 7. Décisions à prendre avant de coder

1. ~~Accès de la personne de ménage~~ — **tranché (2026-11-21) : pas d'accès, envoi par
   WhatsApp.** Aucun changement de sécurité ni de rôle.
2. ~~Langue~~ — **tranché : bilingue français / darija** (voir 3.5), avec suggestion de
   traduction par un service gratuit, validée à la main.
3. ~~Honoraires~~ — **tranché : un paiement daté suffit.**
4. ~~Dépenses vs budgets existants~~ — **tranché : séparées** des budgets, qui restent
   dédiés aux chantiers/projets.
5. ~~Convives~~ — **tranché : par repas** (par créneau), car cela pilote les quantités.
6. ~~Créneaux~~ — **tranché (révisé 2026-11-22) : 3 créneaux** (snacks petit-déj & goûter,
   déjeuner, dîner), comme le cahier ; semaine du samedi au vendredi. Les snacks sont des
   plats du référentiel (catégorie « snack », quantités par unité ou par format).
   ~~Retours~~ — **tranché : 👍/👎** (+ commentaire facultatif).
7. **Service de traduction** : choisir après un essai sur ~20 plats/ingrédients réels
   (voir 3.5, qualité darija non garantie).
8. **Retour de fin de semaine** : message WhatsApp rédigé automatiquement et
   modifiable avant envoi (recommandé), ou texte entièrement libre ?

## 8. Hors périmètre (v1)
Valeurs nutritionnelles, import de recettes depuis le web, commande en ligne /
intégration supermarché, scan de tickets (OCR), gestion de stock précise, multi-foyers.
