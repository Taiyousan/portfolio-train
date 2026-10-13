# La scène du train

Comment fonctionne l'accueil en 3D (`src/three/`), et les pistes pour la suite. Le principe général (le contenu HTML passe avant la 3D) est décrit dans [CLAUDE.md](../CLAUDE.md).

## Le concept

Le train qui roule en forêt est le fil conducteur. Chaque section du portfolio est un arrêt :

- **Projets** : la gare, avec un tableau des départs (une ligne par projet).
- **À propos** : la maison. Sur la terrasse, le conducteur, en sweat et sans képi, travaille à son bureau : le conducteur est un rôle, là c'est le développeur au travail.
- **L'atelier** (mode `custom`) : le visiteur repeint la locomotive et habille le conducteur.
- **Navigation** : des billets de train HTML en bas de l'écran. Le trajet est le centre : on y revient toujours pour aller ailleurs.

| Donnée (`projects.ts` / `site.ts`) | Dans la scène |
|---|---|
| `title`, `order` | Ligne du tableau des départs (titre, heure) |
| `technos` | Sous le titre, sur le tableau |
| `summary`, corps MDX, `tasks`, `images`... | Détail du projet, dans un billet HTML (`ProjectDialog`), captures dans le coupon |
| `site.intro`, `site.skills`, `site.links` | Panneau « À propos » (`AboutPanel`) |

## Chargement

1. `src/app/page.tsx` rend `Experience` (composant client) avec la version HTML de l'accueil en enfants.
2. `Experience` affiche cette version HTML (cachée, mais lue par les lecteurs d'écran et les moteurs de recherche, et visible dès qu'elle reçoit le focus clavier), l'écran de chargement, la surcouche HTML (`ui/Overlay`), et `Scene`.
3. `Scene` (le `<Canvas>`) est chargé à part (`import()` dans un effet ; pas `next/dynamic`, dont le `Suspense` remonte le canvas en dev et lui fait perdre son contexte WebGL) : three.js et tous les modèles sont dans un chunk séparé, téléchargé une fois la page affichée. L'écran de chargement et la version HTML fonctionnent pendant ce temps.
4. Sans WebGL 2 (`useWebGLSupport`), ou si la scène plante (`SceneBoundary`), seule la version HTML s'affiche.
5. Tant que la version HTML a le focus, la scène cachée derrière attend : pas encore montée (la compilation de ses shaders bloquerait la page), ou en pause (`Pause` dans `Scene`, par le drapeau `internal.active` de R3F plutôt que `frameloop`, qui remet l'horloge à zéro). Le curseur y est celui du système (`data-system-cursor`).
6. Tout ce qui se charge dans la scène (`useGLTF`, `Environment`, `<Text>`...) doit rester dans le `<Suspense>` de `TrainScene` : laissé au `<Canvas>`, un chargement en cours suspend la page autour de lui, ce qui provoque en dev une boucle de rendus qui bloque l'écran de chargement.

L'écran de chargement (`ui/LoadingScreen`) : les téléchargements remplissent 85 % de la voie, le reste attend que la scène ait dessiné ses premières images (`ready`, posé par `SceneReady` après le préchauffage des shaders). Puis fondu, et les billets du trajet sont distribués (`boarded`).

## État

- `state/TrainContext` : un état `mode` (`ride` → `arriving` → `stopped` → `departing`, plus `custom`) et l'arrêt visé `stop` (`station` ou `home`, fixé par le billet avant l'arrivée). Chaque mode définit la vitesse du train, le plan de caméra et l'interface HTML affichée. Ce qui change à chaque image (vitesse, saut de la locomotive, poids des saisons) est dans des refs, lues dans `useFrame`.
- `state/LiveryContext` : livrée et tenue choisies à l'atelier, mémorisées dans le navigateur (`localStorage`, clé `train-livery`) ; tout échec retombe sur les valeurs d'origine.

## Le monde défile

Le train reste en z = 0 et le monde défile : traverses et forêt par tuiles qui bouclent (`useScrollingLoop`) ; les rails, identiques sur toute leur longueur, restent fixes (`Rails`). À l'arrivée, l'arrêt apparaît à `STOP_DISTANCE` et le train freine pour s'arrêter pile au quai (`useStopApproach`, décélération constante). Les éléments de l'arrêt apparaissent l'un après l'autre avec un rebond, et repartent dans l'ordre inverse au départ (`useStopPop`).

## Caméra

- Un plan par mode et par arrêt, dans `config/scene.ts`, animé par `CameraControls.setLookAt`.
- Gare : plan large à l'arrivée, vue de trois quarts une fois arrêté, zoom sur le tableau au clic.
- Téléphone (moins de 640 px) : plans dédiés. En portrait, le champ de vision s'élargit pour voir aussi large qu'un écran carré (`fittedFov`).
- Atelier : la caméra recule jusqu'à ce que le sujet tienne dans la place laissée par le panneau (`workshopShot`, `WORKSHOP_FRAME`). Face au soleil couchant, le halo du ciel et le bloom s'atténuent (`WORKSHOP_GLARE`).

## Mode debug

Ajouter `#debug` à l'URL : panneau Leva et caméra libre.

- Les réglages ajustables à chaud sont déclarés avec `useTweaks(dossier, schéma)` (`debug/tweaks.ts`), même schéma que `useControls` de Leva. Sans `#debug`, ce sont les valeurs par défaut, et Leva n'est pas téléchargé : ne pas importer `leva` ailleurs que dans `debug/`.
- **Diagnostic** : un bandeau en bas de l'écran (`debug/ErrorReadout`) affiche l'étape du chargement, les erreurs, les pertes de contexte WebGL et l'appareil. Utile sur téléphone, sans console sous la main.
- **Cadrer un plan** : tourner la caméra à la main, puis recopier position et cible du moniteur « Camera » dans `config/scene.ts`.

## Les arrêts

- **Gare** : `StationDecor` (quai, bâtiment, accessoires), `StationBoard` (tableau des départs 3D, texte en Geist Mono via `<Text>` de drei), et le conducteur sur le quai, debout puis adossé au tableau ouvert. Le tableau 3D est l'interface ; sa doublure HTML (`ui/DeparturesBoard`) est lue par les lecteurs d'écran et apparaît au focus clavier. Une ligne ouvre le projet dans un `<dialog>` natif (`ui/ProjectDialog`).
- **Indices** (gare seulement) : une boule lumineuse au-dessus de chaque élément cliquable pas encore cliqué (`HintOrb`), une petite secousse de temps en temps (`state/StationHints`), une flèche au-dessus du tableau.
- **Maison** : `HomeDecor` (halte, terrasse, cabane) et `Home` (bureau, conducteur qui tape). Même mécanique que la gare, sans indices : à découvrir. Panneau « À propos » à l'arrêt.
- **Accessoires** (`StationProps`) : chacun joue une petite animation au clic (`useStationProp`).
- La maison arrête le pointeur (`OPAQUE` dans `Home`) : R3F transmet un clic à tout objet traversé par le rayon, pas seulement au plus proche, et un clic sur la terrasse allumerait la maison derrière.

## Atelier

`ui/Workshop` : deux onglets, Locomotive (livrées toutes faites, puis caisse, toit et garnitures) et Conducteur (trois tenues, puis couleurs). Palette volontairement fermée (`config/livery.ts`) pour que tout mélange reste joli. La scène suit en direct : la locomotive rebondit à chaque changement de peinture, le conducteur se tourne vers la caméra à chaque changement de tenue.

## Mentions légales

Un petit lien en bas à droite (et un autre dans le panneau « À propos ») les ouvre dans une fenêtre par-dessus la scène (`ui/LegalDialog`), pour retrouver le train tel quel en la fermant : la page `/mentions-legales` rechargerait la scène au retour. Elle reste pour un accès direct, ou un clic avec Ctrl.

## Saisons

Été (par défaut, quelle que soit la date), automne, hiver, et la pluie (ciel couvert, sol mouillé). `config/seasons.ts` : couleurs, lumière, ciel, feuilles, neige et pluie par ambiance, en fondu de l'une à l'autre (`hooks/useSeason`). En automne, les feuillages qui roussissent (`aTint` à 2 dans `forestShapes` : feuillus, buissons, herbes) prennent chacun une couleur de `AUTUMN_LEAVES`, tirée de leur numéro d'instance (`shaders/forestMaterial`) ; les sapins et les rochers ne changent pas. La neige (`shaders/snow.ts`) se pose sur tout ce qui regarde vers le haut ; `NoSnow` l'exclut (ce qui sert ou chauffe), `PinnedSnow` la fixe à ce qui bouge (couvercle, porte).

## Décor

- Forêt (`Forest`, formes dans `forestShapes`) : chaque type est une seule géométrie (parties fusionnées, couleurs dans les sommets), instanciée une fois par tuile. Les éléments gardent leurs distances entre eux (pas de couronnes fusionnées). Côté arrêts, seul un accotement de `STOP_SIDE_VERGE` reste dégagé (le couloir du lapin) : ce qui se trouve sous un arrêt en vue, ou autour de la caméra de l'atelier, rétrécit jusqu'à disparaître. Côté caméra, un couloir reste libre devant elle.
- Mares (`Pond`), nuages, lapin, oiseau, fumée (`shaders/smoke.ts`, toutes les bouffées en un seul appel de dessin), flocons, feuilles et pluie qui tombent (`Fall`, un même shader pour les trois, la forme des points réglable).

## Performances et accessibilité

- three.js chargé après la page ; Leva seulement en debug.
- Formes fusionnées et instanciées ; fumée, flocons, feuilles et pluie en un appel de dessin chacun.
- Shaders préchauffés pendant le chargement (`useShaderWarmup`) : pas de saccade à la première arrivée. Tous sont compilés avant d'être dessinés, pour que le navigateur les construise en parallèle : la compilation, une à une, était l'essentiel du temps de chargement.
- Blocs et cylindres (`StationPrimitives`) partagent géométries et matériaux entre éléments identiques : des centaines de pièces, peu de formes et de couleurs différentes. Utiliser `Block`, `Cylinder` et `RoundedBox` de `StationPrimitives`, pas le `RoundedBox` de drei.
- Éclairage d'environnement servi par le site et réduit (`public/hdri/sunset.hdr`, 512 × 256).
- Résolution adaptative : sous 40 images par seconde pendant quelques secondes, elle baisse d'un cran (`Scene`).
- `prefers-reduced-motion` (`hooks/useReducedMotion`) : animations figées, lapin, oiseau, flocons, feuilles et pluie qui tombent retirés.
- Le trajet est annoncé aux lecteurs d'écran (`aria-live`), chaque panneau prend le focus, Échap ramène en arrière, zones tactiles d'au moins 44 px.

## Pistes

- Une URL par section (`/projets`, `/a-propos`), reliée à `mode`, avec le `<Canvas>` dans le layout pour qu'il persiste entre les routes.
- Un bouton visible pour passer à la version HTML de l'accueil (aujourd'hui, seul le clavier la fait apparaître).
- Faire descendre le conducteur de la cabine plutôt que le faire disparaître et réapparaître.
- Printemps.
- Contact par télégramme (la locomotive siffle), wagon de marchandises pour les compétences, CV en billet de train, jour et nuit, levier de vitesse, son d'ambiance (coupé par défaut).
- Afficher les crédits des modèles 3D sous licence CC-BY (`assets-src/CREDITS.md`).

## Écarté

- Pancartes 3D flottant de part et d'autre du train, puis plan de ligne HTML : peu lisibles ou trop abstraits. Remplacés par les billets.
- Navigation directe d'un écran à l'autre : le trajet entre deux écrans renforce le concept, et les écrans restent plus lisibles.
- Gare en modèles Sketchfab : la gare en primitives arrondies rend mieux et reste dans la DA de la maison.
- Volée de plusieurs oiseaux : à la caméra, elle semblait faire du sur-place.

## Modèles 3D

Tout ce qui est dans `public/` est publié : seuls les `.glb` allégés vont dans `public/models/`. Les fichiers bruts, les scripts d'extraction et la liste des crédits sont dans `assets-src/`, hors git.
