# Portfolio train : idées et pistes

Document de travail. Rien n'est tranché : c'est une trace des idées, à reprendre et à rayer au fil des décisions.

Dernière mise à jour : 25/09/2026.

## Le concept

Le train qui roule en forêt est le fil conducteur. Chaque section du portfolio est un lieu ou un moment du voyage :

- **Projets** : le train s'arrête à une gare, où un tableau des départs liste les projets.
- **À propos** : le train s'arrête à une seconde station, une maison. Sur la terrasse, le conducteur, sans son képi, travaille à un bureau sur son ordinateur : le conducteur est un rôle, là c'est le développeur au travail.
- **Zoom sur le conducteur** (mode `custom`) : conservé pour une future activité, il n'affiche rien pour l'instant.
- **Navigation** : des billets de train en bas de l'écran servent de boutons.

## Base de code

Le train est porté dans ce dépôt, sur la branche `feat/proto-train` : `src/three/`, page `/proto/train` (ajouter `#debug` à l'URL pour le panneau Leva). Le contenu (`content/projets/*.mdx`, `src/lib/site.ts`) reste la source de vérité ; la 3D ne fait que le mettre en scène. Comme l'étagère (`feat/proto-bookshelf`), c'est un prototype : on ne fusionne dans `main` que le concept retenu.

L'ancien dépôt Vite, `../portfolio-pro-train`, sert d'archive et de bac à sable.

La migration est terminée :

- La fumée a son propre shader (`src/three/shaders/smoke.ts`) à la place de l'ancien shader NodeToy, incompatible avec R3F 9. Même rendu « toon » (éclairage en paliers, reflet net, liseré clair), plus des bouffées qui ondulent et se désagrègent en fin de vie.
- La forêt laisse un couloir libre entre la caméra et le train (réglage `clearing` dans le panneau Leva, groupe Forest).

## Correspondance contenu → mise en scène

Le schéma de `portfolio-2026` s'adapte bien au thème ferroviaire :

| Donnée (`projects.ts` / `site.ts`) | Dans la scène |
|---|---|
| `title` | Destination sur le tableau des départs |
| `order` | Ordre des départs (heure affichée) |
| `type` (`pro` / `perso`) | Catégorie de train (« Grandes lignes » / « Régional ») ou couleur de ligne |
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

Un état global `mode` : `ride` → `arriving` → `stopped` → `departing`, plus `custom` (zoom sur la cabine, en attente d'une activité). Un second état, `stop` (`station` ou `home`), dit à quel arrêt s'appliquent `arriving`, `stopped` et `departing` ; il est fixé par le billet, avant l'arrivée. Chaque mode (et chaque arrêt) définit :

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

- Seconde station (`src/three/models/Home.tsx`), du même côté de la voie que la gare, avec la même approche (`useStopApproach`) : une petite halte en bois avec un panneau au nom du site, une terrasse de plain-pied, la maison derrière (fenêtre éclairée, lanterne).
- Sur la terrasse, le conducteur descendu de la cabine, sans képi (`Driver` : `cap={false}`, `typing`), tape sur un portable à un bureau. Réglages `HOME_DESK` (groupe Leva « Maison »).
- Deux plans : `HOME_CAMERA` (large, pendant l'arrivée), puis `HOME_VIEW_CAMERA`, au-dessus du train, le bureau à gauche du cadre.
- Le panneau « À propos » (`AboutPanel`) s'affiche à l'arrêt : carte à droite sur ordinateur, panneau en bas sur téléphone ; « Repartir » ou Échap pour repartir.
- Pistes : une tenue « civile » à la maison ; le train qui va directement de la gare à la maison, sans repasser par le trajet en forêt.

### Zoom sur le conducteur (mode `custom`)

- Billet « À venir » ou clic sur le conducteur pendant le trajet : zoom sur la cabine (`CUSTOM_CAMERA`), billet « Retour au voyage » ou Échap pour revenir. Rien d'autre pour l'instant : réservé à une future activité.

### Navigation

- Essayé puis abandonné : des pancartes 3D en bois flottant de part et d'autre du train (peu lisibles, en doublon avec les boutons HTML), puis un plan de ligne HTML (trop abstrait : « En route » n'est pas une section).
- Retenu : des **billets de train** en HTML (`src/three/ui/Ticket.tsx`), en bas de l'écran, seulement ceux qui ont un sens là où se trouve le train : « Mes projets » (vers la gare) et « Qui suis-je ? » (vers la maison) et « À venir » (mode `custom`) en route, « Voir les projets » (zoom sur le tableau) et « Repartir » en gare (sur ordinateur ; sur téléphone, le tableau HTML a les deux). En haut, le nom (lien vers l'accueil) et le choix de la saison.

### Saisons

- Bouton HTML en haut à droite (`src/three/ui/SeasonSwitch.tsx`) : été (la scène d'origine) ou hiver (sol et sapins enneigés, neige sur les toits, flocons qui dérivent avec la vitesse du train, lumière et ciel plus froids). Simple habillage : rien d'autre ne dépend de la saison.
- Une palette et quelques réglages par saison dans `src/three/config/seasons.ts` ; la scène passe de l'une à l'autre en fondu (`src/three/hooks/useSeason.ts`), instantanément avec `prefers-reduced-motion` (et sans flocons).
- À venir : printemps et automne. Les sapins ne changent pas au fil des saisons : il faudra des feuillus (feuilles rousses qui tombent, fleurs). Piste : saison par défaut selon la date réelle.

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
   - « À propos » : carte à droite sur ordinateur, panneau en bas sur téléphone, à l'arrêt à la maison (voir « À propos : la maison ») ; Échap ou « Repartir » pour repartir.
   - Tableau des départs en gare : un vrai tableau 3D (`src/three/models/StationBoard.tsx`, texte en Geist Mono via `<Text>` de drei), de taille réaliste, sur le quai et parallèle à lui. Quatre plans de caméra : train en marche (`RIDE_CAMERA`), arrivée en gare, large (`STATION_CAMERA`), puis `STOP_SETTLE_MS` après l'arrêt, plan d'interaction face au quai (`STATION_VIEW_CAMERA`), et zoom sur le tableau au clic (`BOARD_CAMERA`). Le cadre du tableau luit doucement pour inviter au clic (plus fort au survol). Zoomé, les lignes deviennent cliquables et défilent façon Solari (désactivé avec `prefers-reduced-motion`) ; « × Fermer » ou Échap ramènent au plan d'interaction. Une ligne par projet (heure tirée de l'ordre, « Grandes lignes » / « Régional », voie). Réglages dans le groupe Leva « Tableau ». Billet « Repartir » en bas de l'écran, qui reste en place tableau zoomé.
   - En gare, le conducteur quitte la cabine : debout sur le quai à gauche du tableau, puis assis au bord du quai à sa droite une fois le tableau zoomé, pour être dans le même plan (poses de `Driver`, réglages `STATION_DRIVER`).
   - Doublure HTML du tableau (`src/three/ui/DeparturesBoard.tsx`), avec les mêmes lignes : c'est l'interface sur téléphone (panneau en bas). Sur ordinateur, elle reste invisible mais lue par les lecteurs d'écran, et apparaît dès qu'elle a le focus (arrivée en gare au clavier, Tab).
   - Détail d'un projet : `<dialog>` natif avec le même contenu que `/projets/<slug>` (composant partagé `src/components/ProjectDetail.tsx`, rendu côté serveur), habillé en billet remis après le choix sur le tableau : bande à volets en tête, puis carton crème sous une perforation encochée (classe `.theme-ticket` de `globals.css`, qui redéfinit les jetons de couleur pour tout le sous-arbre ; encoches `.notch-top` / `.notch-bottom`). Le panneau « À propos » garde l'habillage du tableau (`.theme-board`).
   - À faire : remplacer le quai provisoire ; faire descendre le conducteur de la cabine plutôt que de le faire disparaître et réapparaître ; cadrer le tableau 3D en portrait (étape 7) ; relier projet ouvert et mode aux URL (étape 4) ; éventuellement, de vraies palettes 3D qui basculent.
6. **Navigation** : billets de train HTML (fait, voir plus haut).
7. **Finitions** : téléphone, son, fumée, petits secrets.
