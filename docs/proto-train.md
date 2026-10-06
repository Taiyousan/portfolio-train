# Portfolio train : idées et pistes

Document de travail. Rien n'est tranché : c'est une trace des idées, à reprendre et à rayer au fil des décisions.

Dernière mise à jour : 06/10/2026.

## Le concept

Le train qui roule en forêt est le fil conducteur. Chaque section du portfolio est un lieu ou un moment du voyage :

- **Projets** : le train s'arrête à une gare, où un tableau des départs liste les projets.
- **À propos** : le train s'arrête à une seconde station, une maison. Sur la terrasse, le conducteur, en sweat et sans son képi, travaille à un bureau sur son ordinateur : le conducteur est un rôle, là c'est le développeur au travail.
- **Atelier** (mode `custom`) : le visiteur repeint la locomotive et habille le conducteur.
- **Navigation** : des billets de train en bas de l'écran servent de boutons.

## Base de code

Le train est porté dans ce dépôt, sur la branche `feat/proto-train` : `src/three/`, page `/proto/train` (ajouter `#debug` à l'URL pour le panneau Leva). Le contenu (`content/projets/*.mdx`, `src/lib/site.ts`) reste la source de vérité ; la 3D ne fait que le mettre en scène. Comme l'étagère (`feat/proto-bookshelf`), c'est un prototype : on ne fusionne dans `main` que le concept retenu.

L'ancien dépôt Vite, `../portfolio-pro-train`, sert d'archive et de bac à sable.

La migration est terminée :

- La fumée a son propre shader (`src/three/shaders/smoke.ts`) à la place de l'ancien shader NodeToy, incompatible avec R3F 9. Même rendu « toon » (éclairage en paliers, reflet net, liseré clair), plus des bouffées qui ondulent et se désagrègent en fin de vie. Les bouffées sortent au rythme des roues motrices (elles s'espacent au freinage, la loco « respire » à l'arrêt), puis chacune suit sa propre trajectoire (jet, montée, emportée par l'air) : un changement de vitesse ne déplace pas celles déjà sorties. Toutes sont dessinées en un seul appel (`InstancedMesh`), réglages dans le panneau Leva « Smoke ».
- La forêt laisse un couloir libre entre la caméra et le train (réglage `clearing` dans le panneau Leva, groupe Forest).

### Décor

- Forêt (`src/three/models/Forest.tsx`) dans la DA arrondie de la gare et de la maison, par tuiles qui défilent avec les rails. Formes dans `src/three/models/forestShapes.ts` : chaque type est une seule géométrie (parties fusionnées, couleurs dans les sommets), instanciée une fois par tuile ; la couleur de chaque instance teinte ses ramures, ses feuilles ou sa roche, autour d'une palette par type.
  - Arbres : sapin à étages arrondis, feuillu en boules (un sur six déjà roux), peuplier fuselé, bouleau à tronc blanc marqué de noir (un sur cinq jaune).
  - Buissons (simples ou fleuris : les fleurs sont un second maillage sur les mêmes emplacements, qui s'efface en hiver), rochers (galet, rocher moussu, tas de pierres).
  - Petits détails près de la voie, occasionnels (environ trois par côté et par tuile, tous types confondus) : touffes d'herbe, fleurs, champignons rouges à pois, souches, bûches. Les comptes par type sont des moyennes : les plus rares (souches, bûches) ne viennent pas à chaque tuile. Eux seuls vont aussi dans la bande devant les arrêts, où ils rapetissent jusqu'à disparaître dès qu'un arrêt est en vue (`STOP_HALF_LENGTH`), et reviennent une fois l'arrêt caché.
  - Rarement une mare (`src/three/models/Pond.tsx`, environ une tuile sur douze, réglage `pondChance`) au bord de la voie, du côté des arrêts : eau bleue sans reflet, berge, galets, roseaux, nénuphars dont un fleuri. Comme les détails, elle s'efface sous un arrêt en vue ; les autres éléments s'en écartent.
  - Densités et étendues par catégorie dans le groupe Leva « Forest ».
- Matériau commun (`src/three/shaders/forestMaterial.ts`) : en hiver, la neige se pose sur tout ce qui regarde vers le haut (ramures, rochers, souches, berges), avec un bord ondulé, d'un seul uniform ; l'herbe, les fleurs, les champignons, les roseaux et les nénuphars s'aplatissent dans le sol, et l'eau gèle (couleur de saison). Remplace les chapeaux de neige des anciens pins.
- Nuages (`src/three/models/Clouds.tsx`) : boules fusionnées à fond plat, loin derrière la forêt, hors du brouillard, lumineux dans la couleur de la saison. Ils dérivent lentement (une fraction de la vitesse du train, plus une brise).
- Lapin (`src/three/models/Bunny.tsx`) : de loin en loin (toutes les 25 à 50 s), un lapin arrive par l'avant et gambade le long de la voie, par bonds, avec des pauses où il remue les oreilles et regarde autour de lui, puis se fait distancer ou file dans la forêt. Seulement pendant le trajet : à l'approche d'un arrêt, il disparaît.
- Oiseau (`src/three/models/Bird.tsx`) : de temps en temps un oiseau traverse tout le champ, loin derrière la voie et au-dessus des arbres, battements d'ailes entrecoupés de vol plané. Hors du brouillard, qui l'effacerait à cette distance. Une volée de deux ou trois oiseaux a été essayée puis retirée : à la caméra, elle semblait faire du sur-place.
- Avec `prefers-reduced-motion`, ni lapin ni oiseau, et les nuages ne bougent plus que pour suivre le train.

## Correspondance contenu → mise en scène

Le schéma de `portfolio-2026` s'adapte bien au thème ferroviaire :

| Donnée (`projects.ts` / `site.ts`) | Dans la scène |
|---|---|
| `title` | Destination sur le tableau des départs |
| `order` | Ordre des départs (heure affichée) |
| `type` (`pro` / `perso`) | Non affiché dans la scène |
| `technos` | Gares desservies (« Dessert : React · Three · R3F ») |
| `clients`, `partners` | Compagnie / exploitant |
| `summary` | Sous-titre défilant sous la destination |
| `video`, `thumb` | Écran d'affichage ou affiche sur le quai |
| corps MDX | Détail du projet, en HTML |
| `site.intro`, `site.education` | Panneau « À propos » à côté du conducteur |
| `site.skills` (3 niveaux) | Wagon de marchandises : caisses étiquetées par techno |
| `site.links.cv` | Billet de train à télécharger |
| `site.links.email` | Télégramme (formulaire de contact) |

## Principes

- **La 3D pour la mise en scène, le HTML pour le contenu.** Le texte dans une texture 3D est flou, illisible sur téléphone, invisible pour les moteurs de recherche et les lecteurs d'écran.
- **Une seule machine à états** pilote tout (voir plus bas).
- **Chaque section a une URL** (`/projets`, `/projets/<slug>`, `/a-propos`) : liens partageables, bouton retour du navigateur.
- **Une navigation HTML discrète double toujours les boutons 3D** (clavier, accessibilité, recruteurs pressés).

## Architecture technique

### Machine à états

Un état global `mode` : `ride` → `arriving` → `stopped` → `departing`, plus `custom` (l'atelier). Un second état, `stop` (`station` ou `home`), dit à quel arrêt s'appliquent `arriving`, `stopped` et `departing` ; il est fixé par le billet, avant l'arrivée. Chaque mode (et chaque arrêt) définit :

- une vitesse cible du train ;
- une position de caméra (`cameraControls.setLookAt(..., true)` anime la transition) ;
- l'interface HTML affichée.

### Vitesse lissée

Aujourd'hui, `trainSpeed` est un `useState` changé d'un coup. Il faut une vitesse courante dans une ref, qui tend vers une vitesse cible dans `useFrame`. Cela évite les arrêts brusques et les re-renders à chaque changement.

### Arrivée en gare

Le train est fixe et le monde défile (`useScrollingLoop`), ce qui facilite l'arrivée :

- La gare apparaît loin devant, cachée dans le brouillard, et avance avec le décor.
- La décélération est calculée pour s'arrêter pile au quai : `a = v² / 2d`.
- Au départ, on réaccélère et la gare repart derrière.

### Caméra

- En mode `ride`, limiter les `CameraControls` (angles restreints) ou passer en caméra fixe avec un léger parallaxe à la souris. Sinon l'utilisateur tourne la vue et perd les panneaux.
- Adapter la distance ou le champ de vision au format d'écran (portrait sur téléphone).

## Sections

### Projets : la gare

- **Tableau des départs à palettes** (type Solari, lettres qui défilent). Une ligne par projet.
- Clic sur une ligne : ouverture du détail (HTML), avec la vidéo.
- Le tableau 3D est du décor ; l'interface consultable est une surcouche HTML dans le même style.
- Variante : affiches de projets sur le quai.

### À propos : la maison

- Seconde station (`src/three/models/Home.tsx`, décor dans `src/three/models/HomeDecor.tsx`), du même côté de la voie que la gare, avec la même approche (`useStopApproach`). Construite comme la gare, dans ses unités et à son échelle (`HOME_SCALE`), avec ses primitives arrondies et ses accessoires : une halte en planches avec un panneau au nom du site (petit toit) et une boîte aux lettres jaune, une terrasse de plain-pied entre deux rambardes, puis une cabane en bois à bardage, toit d'ardoise et cheminée, fenêtre à volets, porte bleu-vert à vitre éclairée, lanterne murale, lampadaire, deux pots fleuris, et une raquette de ping-pong posée par terre avec sa balle. À l'arrêt, la maison et chaque élément apparaissent l'un après l'autre avec un rebond, le bureau en dernier ; au départ, dans l'ordre inverse, puis la halte s'enfonce. Neige sur le toit, la cheminée et le panneau en hiver.
- Comme à la gare, le décor réagit au clic, mais sans indices (ni boule jaune, ni secousses) : la maison éteint ses lumières et ferme ses volets (puis l'inverse), le lampadaire clignote, les pots sautent, la boîte aux lettres (creuse : un tube arrondi extrudé, fermé par une plaque, la porte de même forme) s'ouvre et les lettres empilées dedans glissent un peu dehors en éventail irrégulier, puis rentrent. La raquette de ping-pong se soulève et fait rebondir trois fois sa balle avant de la renvoyer à sa place. Un clic sur le conducteur lui fait lever les yeux vers la caméra un instant (`DriverHandle.glance()`) : la tête se tourne, les épaules un peu avec, les sourcils se lèvent et il cesse de taper, puis reprend. Les planchers (halte, terrasse, soubassement, paillasson) arrêtent le pointeur : sans ça, R3F transmet le clic à tout objet traversé par le rayon, et un clic sur le perron allumait la maison derrière. `StationHints` prend l'arrêt concerné (`stop`, les éléments ne sont cliquables qu'à leur arrêt) et `hinted={false}` coupe les indices. Lumières volontairement douces (fenêtres, lanterne murale dont la lumière est décalée devant elle pour ne pas brûler le mur, lampadaire atténué via `brightness`).
- Sur la terrasse, le conducteur descendu de la cabine, en sweat à capuche et sans képi (`Driver` : `outfit={OUTFITS.hoodie}`, ou le sweat recoloré à l'atelier s'il y a été choisi ; `typing`), tape sur un portable à un bureau, calé sur ses mains (`DRIVER_TYPING_HANDS`). Réglages `HOME_DESK` (groupe Leva « Maison »).
- Deux plans : `HOME_CAMERA` (large, pendant l'arrivée), puis `HOME_VIEW_CAMERA`, au-dessus du train, de trois quarts sur la terrasse et la façade, le bureau dans la partie du cadre que le panneau laisse libre.
- Le panneau « À propos » (`AboutPanel`) s'affiche à l'arrêt : carte à droite sur ordinateur, panneau en bas sur téléphone ; « Retour » ou Échap pour repartir.

### Atelier (mode `custom`)

- Billet « L'atelier » ou clic sur le conducteur pendant le trajet ; petit billet « Retour » (sur téléphone, le bouton « Retour au voyage » du panneau) ou Échap pour revenir.
- Panneau `src/three/ui/Workshop.tsx`, habillé en bon d'atelier : bande à volets du tableau en tête, puis carton crème sous une perforation encochée (`.theme-ticket`), comme la fiche projet. Carte à droite sur ordinateur, panneau en bas sur téléphone. Deux onglets :
  - **Locomotive** : six livrées toutes faites (Express, la livrée d'origine, Forestière, Minuit, Charbon, Tournesol, Lagune), chacune illustrée par une petite loco en SVG à ses couleurs, puis « Sur mesure » : caisse, toit et garnitures (laiton, cuivre, chrome...), en pastilles.
  - **Conducteur** : trois tenues (uniforme et képi, salopette avec chemise, foulard et casquette, sweat), avec leur vignette, puis la couleur du haut et du bas (le bas colore aussi le képi, la casquette et la salopette).
  - Pastilles et vignettes sont des boutons radio (flèches du clavier, lecteurs d'écran) ; un lien « D'origine » remet chaque onglet à zéro.
- Palette volontairement fermée (`src/three/config/livery.ts`) : des teintes prises dans la DA (gare, maison), pas de sélecteur libre, pour que tout mélange reste joli.
- Les choix sont dans `src/three/state/LiveryContext.tsx`, séparé de `TrainContext`, et mémorisés dans le navigateur (`localStorage`, clé `train-livery`) : simple confort, tout échec de lecture ou d'écriture retombe sur les valeurs d'origine.
- La scène suit en direct : la locomotive (`Locomotive` lit la livrée ; une nuance plus sombre de la caisse est calculée pour le plancher et les rayons) fait un petit rebond écrasé à chaque changement de peinture, le conducteur tourne la tête vers la caméra à chaque changement de tenue. À l'atelier, sur l'onglet Locomotive, il est accoudé au rebord de la cabine côté caméra, rêveur : penché, le menton sur le poing droit, l'avant-bras gauche posé le long du rebord, la tête inclinée, le regard levé au loin, les paupières lourdes (`Driver` : `leaning`, réglages `LEANING`, calculés pour la hauteur du rebord, voir `DRIVER_LEANING_LEDGE` et `CAB_SILL`). Pour ne pas passer les bras à travers le rebord, il recule un peu en croisant les bras à plat devant la poitrine, à hauteur du rebord, puis s'avance en se penchant et les y pose, le poing droit remontant sous le menton (`LEANING.fold`, `back` ; l'inverse en se redressant). Sur l'onglet Conducteur, il se redresse et se tourne vers la caméra pour poser, puis revient face à la voie en quittant l'atelier. Le conducteur garde sa tenue sur le quai de la gare.
- Caméra : un plan par onglet (`CUSTOM_CAMERAS` : toute la locomotive, ou gros plan sur le conducteur par le côté de la cabine), ajusté à l'écran (`workshopShot` dans `TrainScene`, réglages `WORKSHOP_FRAME`) : la caméra recule jusqu'à ce que le sujet tienne dans la place laissée par le panneau, puis un décalage focal (`setFocalOffset` de camera-controls, dont l'axe y pointe vers le bas) l'y centre. Sur téléphone, les tampons de la loco peuvent être rognés plutôt que de reculer la caméra dans la forêt.
- Pistes : couleur de la fumée, plaque de la cabine au nom du visiteur, sifflet, accessoires (lunettes, écharpe en hiver).

### Navigation

- Essayé puis abandonné : des pancartes 3D en bois flottant de part et d'autre du train (peu lisibles, en doublon avec les boutons HTML), puis un plan de ligne HTML (trop abstrait : « En route » n'est pas une section).
- Retenu : des **billets de train** en HTML (`src/three/ui/Ticket.tsx`), en bas de l'écran, avec **le trajet comme centre de la navigation** : on revient toujours au voyage pour aller ailleurs. En route, un grand billet par écran : « Mes projets » (vers la gare), « Qui suis-je ? » (vers la maison) et « L'atelier » (mode `custom`). Sur un écran, sur ordinateur, seulement un petit billet « Retour », sur carton bleu et en miroir (talon à gauche, flèche demi-tour), et en gare, à côté, un petit billet aller « Voir les projets » (zoom sur le tableau), sur le carton crème des billets du trajet : les deux se répondent en miroir (retour à gauche, aller à droite), et c'est le tableau 3D (rebord, flèche) qui attire l'œil. Essayés puis retirés pour ce billet : un grand format imprimé comme le tableau (encre jaune sur noir) avec une lueur pulsée façon néon, trop différent du billet retour. Une fois le tableau ouvert, il laisse la place à un petit billet « Fermer » (croix sur le talon), qui ramène au plan de la gare, comme « × Fermer » sur le tableau ou Échap ; les deux partagent une place, de la largeur du plus large, pour que « Retour » ne bouge pas. Sur téléphone, le panneau de l'écran a ses propres boutons. Les billets ne disparaissent pas d'un coup : ceux qui partent sont ramassés (ils s'enfoncent en rapetissant, l'un après l'autre), les autres distribués (`Dealt` dans `Overlay`). En haut, le nom (lien vers l'accueil) et le choix de la saison.
- Essayé puis abandonné : naviguer directement d'un écran à l'autre, sans repasser par le trajet. D'abord des billets « Correspondance » à côté du billet retour (écrans surchargés), puis une rangée de petits billets toujours visible, l'écran courant composté, avec un trajet direct gare ↔ maison où le train glissait d'un quai à l'autre. Abandonné : le trajet entre deux écrans renforce le concept au lieu d'être un détour, les écrans restent plus lisibles, il n'y a que trois écrans, et l'accès direct viendra des URL (étape 4).

### Saisons

- Bouton HTML en haut à droite (`src/three/ui/SeasonSwitch.tsx`) : été (la scène d'origine) ou hiver (sol et sapins enneigés, neige sur les toits, flocons qui dérivent avec la vitesse du train, lumière et ciel plus froids). Simple habillage : rien d'autre ne dépend de la saison.
- Une palette et quelques réglages par saison dans `src/three/config/seasons.ts` ; la scène passe de l'une à l'autre en fondu (`src/three/hooks/useSeason.ts`), instantanément avec `prefers-reduced-motion` (et sans flocons).
- À venir : printemps et automne. Les feuillus de la forêt pourraient en suivre le cycle (fleurs, feuilles rousses qui tombent, branches nues en hiver). Piste : saison par défaut selon la date réelle.

## Interactions en plus

- **Contact → sifflet** : la loco siffle avec un jet de vapeur, puis un formulaire façon télégramme s'ouvre.
- **Tunnel de transition** : écran noir le temps de changer de décor (forêt → montagne → ville), pour d'autres sections.
- **Wagon de marchandises** : les compétences en caisses étiquetées.
- **CV en billet de train** (PDF mis en forme).
- **Jour / nuit** comme mode sombre : lanternes allumées, lucioles.
- **Levier de vitesse** dans la cabine : le visiteur accélère ou freine.
- **Petits secrets** : un cerf qui traverse de temps en temps, un clic sur la fumée qui fait un rond.
- **Son d'ambiance** (roulement, oiseaux), coupé par défaut, avec un bouton pour l'activer.

## Téléphone et performances

- Caméra adaptée au format portrait.
- `PerformanceMonitor` (drei) pour baisser la résolution, la densité d'arbres ou le post-traitement sur les appareils faibles.
- Respecter `prefers-reduced-motion` : transitions de caméra réduites.
- Zones tactiles d'au moins 44 px.
- Site utilisable sans WebGL (le contenu HTML suffit).

## Ordre proposé

1. **Bases** : état `mode`, vitesse lissée, positions de caméra.
2. **À propos** : déplacement de caméra vers le conducteur.
3. **Arrivée et départ en gare** : le freinage calculé.
4. **Routage** : une URL par section, reliée à l'état `mode` ; `<Canvas>` dans le layout pour qu'il persiste entre les routes.
5. **Interfaces HTML** : panneau « À propos », tableau des départs, détail d'un projet.
   Fait (`src/three/ui/`), piloté par `mode` en attendant le routage de l'étape 4 :
   - « À propos » : carte à droite sur ordinateur, panneau en bas sur téléphone, à l'arrêt à la maison (voir « À propos : la maison ») ; Échap ou « Retour » pour repartir.
   - Tableau des départs en gare : un vrai tableau 3D (`src/three/models/StationBoard.tsx`, texte en Geist Mono via `<Text>` de drei), de taille réaliste, sur le quai et parallèle à lui. Quatre plans de caméra : train en marche (`RIDE_CAMERA`), arrivée en gare, large (`STATION_CAMERA`), puis `STOP_SETTLE_MS` après l'arrêt, plan d'interaction face au quai (`STATION_VIEW_CAMERA`), et zoom sur le tableau au clic (`BOARD_CAMERA`). Pour inviter au clic, le rebord du tableau bat d'une lueur vive (montée rapide, descente lente, assez forte pour le bloom ; plus encore au survol), et une grosse flèche jaune lumineuse flotte au-dessus du toit, pointée vers lui : elle tape au rythme de la lueur et se balance (immobile avec `prefers-reduced-motion`), cliquable comme le tableau, et disparaît une fois le tableau ouvert (réglages `ARROW`). Zoomé, les lignes deviennent cliquables et défilent façon Solari (désactivé avec `prefers-reduced-motion`) ; « × Fermer », Échap ou le billet « Fermer » ramènent au plan d'interaction. Une ligne par projet (heure tirée de l'ordre, voie). Réglages dans le groupe Leva « Tableau ». Petit billet « Retour » en bas de l'écran, qui reste en place tableau zoomé.
   - En gare, le conducteur quitte la cabine : debout sur le quai à gauche du tableau, puis, une fois le tableau zoomé, adossé au côté droit du tableau, pour être dans le même plan, l'air de passer le temps : penché en arrière, de trois quarts, les mains dans les poches, le poids sur une jambe, la pointe de l'autre pied qui tapote par moments, des coups d'œil alentour (pose `propped` de `Driver`, réglages `PROPPED` ; placé depuis le bord du tableau, `STATION_BOARD_SIDE` et `DRIVER_PROPPED_BACK`, tourné de `STATION_DRIVER.propped.yaw` : plus face à la caméra, il masquerait la fin des lignes du tableau). Debout, il salue quand on clique dessus.
   - Le conducteur (`src/three/models/Driver.tsx`) : personnage cartoon arrondi comme la gare (cheveux bouclés, barbe courte, moustache ; uniforme et képi, salopette et casquette, ou sweat, au choix à l'atelier, sweat à la maison), monté sur un squelette de groupes articulés (hanches, genoux, colonne, épaules, coudes, cou) animés à chaque image : respiration, clignements, coups d'œil, jambes qui se balancent assis, pied qui tapote adossé, frappe au clavier, salut (`DriverHandle.wave()`), regard vers la caméra (`DriverHandle.glance()`). Figé avec `prefers-reduced-motion`.
   - Doublure HTML du tableau (`src/three/ui/DeparturesBoard.tsx`), avec les mêmes lignes : c'est l'interface sur téléphone (panneau en bas). Sur ordinateur, elle reste invisible mais lue par les lecteurs d'écran, et apparaît dès qu'elle a le focus (arrivée en gare au clavier, Tab).
   - Détail d'un projet : `<dialog>` natif (`src/three/ui/ProjectDialog.tsx`) qui a la forme d'un billet, comme les billets de navigation, mais dont le texte reste neutre (pas de faux champs de billet, qui se confondaient avec le contenu) : bandeau « Projet pro / perso », titre, résumé, rôle, client, partenaires, technos, texte du MDX (rendu côté serveur), missions. Coupon détachable à droite (en bas sur téléphone) derrière une perforation encochée, avec trois emplacements d'image vides en attendant les visuels de chaque projet (`IMAGE_SLOTS`), un code-barres décoratif (ordinateur seulement), « Voir en ligne » et « Fermer ». Seule la partie principale défile. Couleurs via `.theme-ticket` de `globals.css` (redéfinit les jetons pour tout le sous-arbre) ; encoches avec les utilitaires `notch-top` / `notch-bottom` / `notch-left` / `notch-right`. Le panneau « À propos » garde l'habillage du tableau (`.theme-board`).
   - Gare (`src/three/models/StationDecor.tsx`) : construite en primitives arrondies (`RoundedBox`, extrusions biseautées), style 3D cartoon, palette chaude de la maison. Bâtiment à toit rouge et cheminée, fenêtres éclairées et jardinières, auvent avec panneau « GARE » et horloge, escalier à rambardes, banc, bagages, poubelle, pots fleuris, deux lampadaires allumés. Le tableau des départs reprend la même DA (cadre en bois arrondi, petit toit, poteaux ronds). À l'arrêt, le bâtiment et chaque élément apparaissent l'un après l'autre avec un rebond, le tableau en dernier ; au départ, dans l'ordre inverse, puis le quai s'enfonce. Réglages dans le groupe Leva « Gare ». À l'arrêt, le décor réagit au clic (horloge, lampadaires, poubelle, valise, banc, pots, fenêtres du bâtiment) ; pour le signaler, une petite boule jaune lumineuse flotte au-dessus de chaque élément pas encore cliqué (`src/three/models/HintOrb.tsx` : plus vive au survol, elle disparaît au clic), et toutes les 2 à 3,5 s l'un d'eux (sauf le bâtiment) se secoue (`src/three/state/StationHints.tsx`). Au survol, chaque élément se secoue aussi, plus légèrement, sauf s'il joue déjà son animation. Avec `prefers-reduced-motion`, la boule reste immobile et rien ne se secoue. La forêt reste à distance de toute sa largeur (ramures, buissons).
   - À faire : faire descendre le conducteur de la cabine plutôt que de le faire disparaître et réapparaître ; cadrer le tableau 3D en portrait (étape 7) ; relier projet ouvert et mode aux URL (étape 4) ; éventuellement, de vraies palettes 3D qui basculent.
6. **Navigation** : billets de train HTML (fait, voir plus haut).
7. **Finitions** : téléphone, son, fumée, petits secrets.
8. **Crédits** : afficher sur le site les crédits des modèles 3D sous licence CC-BY, listés au fil de l'eau dans `assets-src/CREDITS.md` (hors git).

## Modèles 3D

- Les fichiers bruts (modèles complets téléchargés), les scripts qui en extraient ce qui sert et la liste des crédits sont dans `assets-src/`, ignoré par git : tout ce qui est dans `public/` est publié avec le site, donc seuls les `.glb` allégés y vont.
- Essayé puis abandonné pour la gare : deux modèles Sketchfab (le second extrait, recoloré et biseauté via Blender). Une gare construite en primitives arrondies (`StationDecor`) rend mieux et reste dans la DA de la maison.
