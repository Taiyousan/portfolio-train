@AGENTS.md

# Portfolio train

Portfolio de Shams Benhamou (dev fullstack spécialisé front-end et 3D, React / Three.js). Next 16 (App Router), React 19, TypeScript, Tailwind 4. Contenu en français. Voir [README.md](README.md) pour la vue d'ensemble et le mode d'emploi côté humain.

## Principe directeur

**Le contenu HTML accessible passe avant la 3D.** Le site doit rester lisible et utilisable sans WebGL (SEO, accessibilité, mobiles faibles). L'accueil est une scène React Three Fiber (un train en forêt), posée *par-dessus* ce contenu, jamais à sa place : `Experience` rend la version HTML de l'accueil en tête de page, masquée visuellement mais lue par les lecteurs d'écran et les moteurs de recherche, affichée par-dessus la scène dès qu'elle reçoit le focus clavier, et seule à la place de la scène quand le navigateur n'a pas WebGL 2, que la scène plante ou qu'elle rame trop. three.js est chargé à part, après la page : il ne doit jamais entrer dans le bundle initial. Les pages projet restent en HTML.

## Structure

```
content/projets/*.mdx   Source de vérité du contenu des projets (1 fichier = 1 projet)
content/pages/*.mdx     Pages de texte seules (mentions légales), lues par src/lib/pages.ts
src/lib/projects.ts     Lecture + validation (zod) des MDX ; getProjects(), getProject(slug)
src/lib/site.ts         Contenu global : identité, intro, compétences, liens de contact
src/lib/url.ts          URL absolue du site (domaine de production Vercel), côté serveur
src/app/layout.tsx      Layout racine (lang="fr", polices, metadata par défaut, Open Graph)
src/app/page.tsx        Accueil : la scène du train (Experience) par-dessus sa version HTML (intro, grille de projets, compétences)
src/app/projets/[slug]/page.tsx   Page d'un projet (SSG via generateStaticParams)
src/app/mentions-legales/page.tsx   Mentions légales et crédits (content/pages/mentions-legales.mdx)
src/app/sitemap.ts, robots.ts, opengraph-image.tsx, icon.svg, apple-icon.tsx, not-found.tsx   SEO, icônes, 404
src/app/globals.css     Tokens de thème (--background, --muted, --line, --accent) + palettes (.theme-ticket, .theme-board)
src/components/         Pièces HTML partagées : StationPage (cadre des pages HTML), Ticket, NameCard, LegalNotice, Cursor
public/projets/<slug>/  thumb.png + captures (shot-1.jpg...) de chaque projet
public/fonts/, hdri/   Ressources de la scène 3D (police du texte 3D, éclairage) ; public/models/ pour d'éventuels .glb
```

## Où créer un nouveau fichier

Ranger par nature de chose, pas par page :

| Zone | Contenu |
|---|---|
| `content/` | Texte et données rédigés par l'utilisateur (projets, futur blog...) |
| `public/` | Fichiers bruts servis tels quels (images, vidéos, `.glb`) |
| `src/app/` | Pages : un dossier = une URL |
| `src/lib/` | Logique sans affichage (lecture/validation du contenu) |
| `src/components/` | Interface réutilisable. N'y extraire un composant que lorsqu'une deuxième page en a besoin (la carte de projet reste inline dans `page.tsx`, le détail d'un projet dans `projets/[slug]/page.tsx` : le train a son propre billet) |
| `src/three/` | Tout le code React Three Fiber (la scène du train, affichée sur l'accueil) |

- **Nouvelle page** : `src/app/<url>/page.tsx`. Texte long → MDX dans `content/`, pas en dur.
- **Nouveau type de contenu** (blog, expériences) : dossier dans `content/` + schéma zod et lecteur dans `src/lib/` sur le modèle de `projects.ts` + pages.
- **Modèles 3D** : `public/models/` (seulement les `.glb` allégés, tout y est publié). Les sources brutes, les scripts d'extraction et la liste des crédits à afficher (`CREDITS.md`) vont dans `assets-src/`, hors git.

### Structure 3D

```
src/three/
  Experience.tsx    point d'entrée, "use client" : version HTML, chargement, surcouche, et Scene
  Scene.tsx         <Canvas> unique, chargé à part (import() dans Experience)
  scenes/           une scène par projet ou par zone
  models/           composants 3D (chargent un .glb ou le construisent)
  hooks/            hooks R3F partagés
  shaders/          matériaux GLSL maison (ShaderMaterial)
  state/            état partagé de la scène (contexte React)
  config/           réglages 3D (positions de caméra et de soleil, échelles)
  ui/               surcouche HTML pilotée par l'état de la scène (panneaux, tableau des départs)
  debug/            panneau Leva, réglages à chaud (useTweaks) et diagnostic à l'écran, seulement avec #debug
```

Fonctionnement détaillé (états, caméra, arrêts, mode debug) et pistes : [docs/scene.md](docs/scene.md).

1. Le code 3D reste dans `src/three/` ; les pages n'importent que `Experience`, et lui passent le contenu en props et leur version HTML en enfants (les lecteurs de `src/lib/` utilisent `node:fs`, donc côté serveur uniquement).
2. Les réglages 3D sont séparés du contenu (jamais dans le frontmatter des MDX).
3. Le contenu ne dépend pas de la 3D : le site doit fonctionner sans `src/three/`.
4. Un réglage à ajuster à chaud passe par `useTweaks` (`debug/tweaks.ts`), jamais par `useControls` : `leva` ne s'importe que dans `debug/`, pour rester hors du bundle de production.
5. Mouvement réduit dans la 3D : `useReducedMotion` (`hooks/`), pas `matchMedia` en direct.
6. Pièces arrondies : `Block`, `Cylinder` et `RoundedBox` de `models/StationPrimitives` (géométries et matériaux partagés, ce qui compte beaucoup au chargement), pas le `RoundedBox` de drei.

## Flux de données

`content/projets/<slug>.mdx` → `src/lib/projects.ts` (gray-matter parse le frontmatter, zod le valide, tri par `order`) → pages. Le corps du MDX est rendu par `MDXRemote` (`next-mdx-remote/rsc`) dans la page projet. Le `slug` est le nom du fichier sans extension et sert d'URL (`/projets/<slug>`).

Un frontmatter invalide **fait échouer le build** avec le nom du fichier : c'est voulu.

## Règles de travail

- **Nouveau projet ou modification de texte** : ne toucher qu'à `content/projets/` et `public/projets/`, jamais au code. Champs du frontmatter : voir le schéma zod dans `src/lib/projects.ts` (source de vérité, ne pas dupliquer la liste ici).
- **Nouveau champ de contenu** : l'ajouter au schéma zod (optionnel ou avec `default` pour ne pas casser les fichiers existants), puis l'afficher dans les pages.
- **Contenu global du site** (intro, compétences, liens) : `src/lib/site.ts`, pas en dur dans les composants.
- **Couleurs** : utiliser les tokens Tailwind (`text-muted`, `border-line`, `bg-accent`), pas de couleurs en dur. Les pages HTML sont sur la palette des billets (`theme-ticket`, via `StationPage`).
- **Textes** : clairs et directs. Le train est un décor, pas un vocabulaire : pas de formules de mise en scène (« destination inconnue » pour une 404, « composté »...).
- **Composants serveur par défaut.** Ne mettre `"use client"` que là où c'est nécessaire (le futur canvas R3F en aura besoin ; le contenu, non).
- **Accessibilité** : respecter `prefers-reduced-motion` (géré globalement dans `globals.css` pour le CSS, `useReducedMotion` pour la 3D), images décoratives avec `alt=""`, titres hiérarchisés.
- **SEO** : une nouvelle page a ses `metadata` (titre, description, `alternates.canonical`) et une entrée dans `src/app/sitemap.ts`. Les images `next/image` affichées en largeur fluide ont un attribut `sizes`.
- **Commentaires** : en anglais, courts, pour le *pourquoi* ou ce qui n'est pas évident. Pas d'historique (« essayé puis retiré », « ancien X ») ni de renvoi à la doc de travail : ça va dans `docs/scene.md` ou dans git.
- **Next 16** : `params` est une Promise (`await params`), et les types globaux `PageProps<"/route">` / `LayoutProps<"/">` existent. En cas de doute sur une API, lire `node_modules/next/dist/docs/` (voir AGENTS.md).
- Les réglages 3D de l'ancien portfolio (`positionX`, `scale`, `groupPosition`) ont été volontairement abandonnés. S'il en faut, ils iront dans un fichier de config 3D séparé, pas dans le frontmatter du contenu.

## Git

> **RÈGLE ABSOLUE : ne jamais commiter, pousser, ouvrir ou fusionner une PR, ni faire aucune action git équivalente (amend, tag, rebase, création de branche distante...) sans l'autorisation explicite de l'utilisateur pour cette action précise. Une autorisation passée ne vaut pas pour la suite. Le workflow ci-dessous décrit *comment* faire quand l'utilisateur le demande, jamais une permission de le faire.**

- **`main` est toujours déployable** (déployé sur Vercel : `main` = production). `npm run build` et `npm run lint` y passent.
- **Ne jamais travailler directement sur `main`** (sauf le tout premier commit d'amorçage du dépôt). Toujours une branche par sujet, créée depuis `main`, courte (un sujet, quelques jours max) :
  - `content/<topic>` contenu · `feat/<topic>` fonctionnalité · `fix/<topic>` correction · `chore/<topic>` config, dépendances, doc (`<topic>` en anglais, en kebab-case)
  - Prototypes 3D : `feat/proto-<nom>`, jetables ; on ne fusionne que celui qui est retenu.
- **Tout passe par une pull request**, y compris le contenu seul : Vercel génère une URL de prévisualisation par PR. Fusion en **squash merge**, puis suppression de la branche. Pas de branche `develop`, pas de tags ni de changelog.
- **Messages de commit** : `préfixe: description courte à l'impératif, en anglais`. Préfixes : `feat` (fonctionnalité visible), `fix`, `content` (projet, texte), `style` (apparence seule), `refactor` (sans changement de comportement), `chore` (config, dépendances, doc). Exemple : `content: add the Configurateur project`.
- **Langue** : tout ce qui touche à git est **en anglais** : messages de commit, noms de branche (ASCII, sans accents ni espaces, ex. `feat/project-page`), titres et descriptions de PR. Le contenu du site (MDX, `site.ts`) et la doc du dépôt (README, CLAUDE.md) restent en français. Commentaires dans le code : en anglais.
- **Ne commiter, pousser ou ouvrir une PR que sur demande explicite de l'utilisateur.** Avant de proposer une fusion : `npm run build` et `npm run lint` doivent passer.

## Commandes

```bash
npm run dev     # serveur de dev
npm run build   # build de prod + vérification TypeScript + validation du contenu
npm run lint    # ESLint
npm run format  # Prettier (+ tri des classes Tailwind) sur le code
```

Lancer `npm run format`, `npm run build` et `npm run lint` avant chaque commit (et donc avant toute PR), pas après chaque modification : pendant le travail, le serveur de dev suffit pour vérifier le rendu.

## Contexte

- L'ancien portfolio est dans `../portfolio-responsive` (référence uniquement : modèles `.glb` dans `public/models/`, ancien contenu). Ne pas y écrire.
