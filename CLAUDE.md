@AGENTS.md

# Portfolio 2026

Portfolio de Shams Benhamou (dev front-end, React / Three.js). Next 16 (App Router), React 19, TypeScript, Tailwind 4. Contenu en français. Voir [README.md](README.md) pour la vue d'ensemble et le mode d'emploi côté humain.

## Principe directeur

**Le contenu HTML accessible passe avant la 3D.** Le site doit rester lisible et utilisable sans WebGL (SEO, accessibilité, mobiles faibles). La couche React Three Fiber, qui n'existe pas encore, viendra *par-dessus* ce contenu, jamais à sa place. La direction 3D (monde, atelier, shaders ou hybride) n'est pas encore tranchée : ne pas l'anticiper dans le code.

## Structure

```
content/projets/*.mdx   Source de vérité du contenu des projets (1 fichier = 1 projet)
src/lib/projects.ts     Lecture + validation (zod) des MDX ; getProjects(), getProject(slug)
src/lib/site.ts         Contenu global : identité, intro, compétences, liens de contact
src/app/layout.tsx      Layout racine (lang="fr", polices, metadata par défaut)
src/app/page.tsx        Accueil : intro, grille de projets, compétences
src/app/projets/[slug]/page.tsx   Page d'un projet (SSG via generateStaticParams)
src/app/globals.css     Tokens de thème (--background, --muted, --line, --accent) + mode sombre
public/projets/<slug>/  thumb.png + video.mp4 de chaque projet
public/doc/cv.pdf       CV
```

## Où créer un nouveau fichier

Ranger par nature de chose, pas par page :

| Zone | Contenu |
|---|---|
| `content/` | Texte et données rédigés par l'utilisateur (projets, futur blog...) |
| `public/` | Fichiers bruts servis tels quels (images, vidéos, CV, `.glb`) |
| `src/app/` | Pages : un dossier = une URL |
| `src/lib/` | Logique sans affichage (lecture/validation du contenu) |
| `src/components/` | Interface réutilisable. N'y extraire un composant que lorsqu'une deuxième page en a besoin (ex. `ProjectDetail`, partagé par `/projets/[slug]` et le prototype du train ; la carte de projet reste inline dans `page.tsx`) |
| `src/three/` | Tout le code React Three Fiber (prototype du train sur `feat/proto-train`, page `/proto/train`) |

- **Nouvelle page** : `src/app/<url>/page.tsx`. Texte long → MDX dans `content/`, pas en dur.
- **Nouveau type de contenu** (blog, expériences) : dossier dans `content/` + schéma zod et lecteur dans `src/lib/` sur le modèle de `projects.ts` + pages.
- **Modèles 3D** : `public/models/`.

### Structure 3D

```
src/three/
  Experience.tsx    <Canvas> unique, "use client"
  scenes/           une scène par projet ou par zone
  models/           composants 3D (chargent un .glb ou le construisent)
  hooks/            hooks R3F partagés
  shaders/          matériaux GLSL maison (ShaderMaterial)
  state/            état partagé de la scène (contexte React)
  config/           réglages 3D (positions de caméra et de soleil, échelles)
  ui/               surcouche HTML pilotée par l'état de la scène (panneaux, tableau des départs)
```

1. Le code 3D reste dans `src/three/` ; les pages n'importent que `Experience`, et lui passent le contenu en props (les lecteurs de `src/lib/` utilisent `node:fs`, donc côté serveur uniquement).
2. Les réglages 3D sont séparés du contenu (jamais dans le frontmatter des MDX).
3. Le contenu ne dépend pas de la 3D : le site doit fonctionner sans `src/three/`.

## Flux de données

`content/projets/<slug>.mdx` → `src/lib/projects.ts` (gray-matter parse le frontmatter, zod le valide, tri par `order`) → pages. Le corps du MDX est rendu par `MDXRemote` (`next-mdx-remote/rsc`) dans la page projet. Le `slug` est le nom du fichier sans extension et sert d'URL (`/projets/<slug>`).

Un frontmatter invalide **fait échouer le build** avec le nom du fichier : c'est voulu.

## Règles de travail

- **Nouveau projet ou modification de texte** : ne toucher qu'à `content/projets/` et `public/projets/`, jamais au code. Champs du frontmatter : voir le schéma zod dans `src/lib/projects.ts` (source de vérité, ne pas dupliquer la liste ici).
- **Nouveau champ de contenu** : l'ajouter au schéma zod (optionnel ou avec `default` pour ne pas casser les fichiers existants), puis l'afficher dans les pages.
- **Contenu global du site** (intro, compétences, liens) : `src/lib/site.ts`, pas en dur dans les composants.
- **Couleurs** : utiliser les tokens Tailwind (`text-muted`, `border-line`, `bg-accent`), pas de couleurs en dur, pour que le mode sombre fonctionne.
- **Composants serveur par défaut.** Ne mettre `"use client"` que là où c'est nécessaire (le futur canvas R3F en aura besoin ; le contenu, non).
- **Accessibilité** : respecter `prefers-reduced-motion` (déjà géré globalement dans `globals.css`), images décoratives avec `alt=""`, titres hiérarchisés.
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
```

Toujours lancer `npm run build` et `npm run lint` avant de conclure une modification.

## Contexte

- L'ancien portfolio est dans `../portfolio-responsive` (référence uniquement : modèles `.glb` dans `public/models/`, ancien contenu). Ne pas y écrire.
