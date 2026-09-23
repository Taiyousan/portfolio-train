# Portfolio train : idées et pistes

Document de travail. Rien n'est tranché : c'est une trace des idées, à reprendre et à rayer au fil des décisions.

Dernière mise à jour : 23/09/2026.

## Le concept

Le train qui roule en forêt est le fil conducteur. Chaque section du portfolio est un lieu ou un moment du voyage :

- **Projets** : le train s'arrête à une gare, où un tableau des départs liste les projets.
- **À propos** : la caméra zoome sur le conducteur, et les informations s'affichent à côté.
- **Navigation** : des panneaux flottants autour du train servent de boutons.

## Base de code

Le train est porté dans ce dépôt, sur la branche `feat/proto-train` : `src/three/`, page `/proto/train` (ajouter `#debug` à l'URL pour le panneau Leva). Le contenu (`content/projets/*.mdx`, `src/lib/site.ts`) reste la source de vérité ; la 3D ne fait que le mettre en scène. Comme l'étagère (`feat/proto-bookshelf`), c'est un prototype : on ne fusionne dans `main` que le concept retenu.

L'ancien dépôt Vite, `../portfolio-pro-train`, sert d'archive et de bac à sable.

**Reste de la migration :**

- La fumée utilise un matériau translucide simple : l'ancien shader NodeToy ne fonctionne pas avec R3F 9. À réécrire en shader maison.
- La forêt étant aléatoire, un arbre ou un buisson peut masquer le train. Laisser un couloir libre côté caméra.

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

Un état global `mode` : `ride` → `arriving` → `station` → `departing`, plus `about`. Chaque mode définit :

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

### À propos : le conducteur

- Zoom caméra sur la cabine ; le conducteur se tourne ou fait un signe de la main.
- Ordinateur : texte à côté du personnage.
- Téléphone : panneau qui monte du bas de l'écran (bottom sheet), conducteur cadré dans la moitié haute.
- Remplacer le placeholder par un personnage stylisé (casquette, badge).

### Panneaux de navigation

- Style **panneaux ferroviaires** : plaques émaillées ou panneaux indicateurs en bois, qui se balancent légèrement.
- Effet au survol (lueur, balancement plus marqué) pour signaler qu'ils sont cliquables.
- Grandes zones de clic, surtout sur téléphone.

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
6. **Panneaux de navigation** 3D + navigation HTML.
7. **Finitions** : téléphone, son, fumée, petits secrets.
