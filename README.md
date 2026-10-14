# Portfolio train

Portfolio de Shams Benhamou, développeur web fullstack, spécialisé front-end et 3D (React, Next.js, Three.js / React Three Fiber).

**Idée directrice : le contenu d'abord.** Le site est un vrai site HTML, lisible en quelques secondes et utilisable sans WebGL. Sur l'accueil, une scène 3D interactive (un train en forêt) se superpose à ce contenu sans le remplacer : la version HTML reste dans la page pour les lecteurs d'écran et les moteurs de recherche, apparaît au clavier, et s'affiche seule si le navigateur ne peut pas dessiner la scène, ou trop lentement.

**Stack :** Next 16 (App Router) · React 19 · TypeScript · Tailwind 4 · MDX (`next-mdx-remote`) · zod · React Three Fiber

## Lancer le projet

```bash
npm install
npm run dev      # http://localhost:3100 (ajouter #debug à l'URL pour les réglages 3D)
npm run build    # build de production (vérifie aussi types et contenu)
npm run lint
npm run format   # formate le code (Prettier, classes Tailwind triées)
```

## Comment c'est organisé

```
content/projets/       Un fichier .mdx par projet (le contenu)
public/projets/<nom>/  La vignette (thumb.png) et les captures (shot-1.jpg...) du projet
src/lib/projects.ts    Lit et valide les fichiers de content/projets
content/pages/         Les pages de texte seules (mentions légales et crédits)
src/lib/site.ts        Textes globaux : intro, compétences, liens de contact
src/app/page.tsx       Page d'accueil (la scène du train et sa version HTML)
src/app/projets/[slug]/page.tsx   Page détail d'un projet
src/app/globals.css    Couleurs (palettes) et styles globaux
src/three/             La scène 3D (voir docs/scene.md)
```

Le référencement est géré par Next : métadonnées dans `layout.tsx` et les pages, `sitemap.ts`, `robots.ts`, l'image de partage (`opengraph-image.tsx`) et l'icône (`icon.svg`). Sur Vercel, l'adresse du site est celle du domaine de production (`src/lib/url.ts`), rien à configurer.

### Où ranger quoi

On range par **nature de chose**, pas par page.

| Zone | Ce qu'on y met |
|---|---|
| `content/` | Du texte et des données que tu écris (projets, plus tard un blog...) |
| `public/` | Des fichiers bruts servis tels quels (images, vidéos, `.glb`) |
| `src/app/` | Des pages : un dossier = une URL |
| `src/lib/` | De la logique sans affichage (lecture et validation du contenu) |
| `src/components/` | Morceaux d'interface utilisés à plusieurs endroits (le cadre des pages, le billet, le curseur) |
| `src/three/` | Tout ce qui touche à React Three Fiber (la scène du train, sur l'accueil) |

**« Je veux ajouter... »**

- **Un projet** : `content/projets/x.mdx` + `public/projets/x/`. Aucun code.
- **Une page** (ex. `/a-propos`) : `src/app/a-propos/page.tsx`. Le nom du dossier devient l'URL. Si le texte est long, le mettre en MDX dans `content/`. Penser à l'ajouter à `src/app/sitemap.ts`.
- **Un morceau d'interface utilisé à plusieurs endroits** : `src/components/`. Par exemple la carte de projet, aujourd'hui écrite dans `page.tsx` : à extraire seulement quand une deuxième page en a besoin.
- **Un nouveau type de contenu** (blog, expériences) : un dossier dans `content/`, un schéma et un lecteur dans `src/lib/` (sur le modèle de `projects.ts`), puis les pages.
- **Du texte global** (intro, liens) : `src/lib/site.ts`.
- **Un modèle 3D** : `public/models/x.glb`.
- **Une couleur ou un style global** : `src/app/globals.css`.

**Pour trancher** : du texte que tu rédiges → `content/` ; un fichier lourd → `public/` ; une URL → `src/app/` ; de la logique ou de l'affichage réutilisable → `src/lib/` ou `src/components/`.

### Structure de la 3D

```
src/three/
  Experience.tsx    point d'entrée, côté client : version HTML, chargement, surcouche, scène
  Scene.tsx         le <Canvas>, chargé à part (three.js n'alourdit pas la page)
  scenes/           une scène par projet ou par zone
  models/           composants 3D (chargent un .glb ou le construisent)
  hooks/            hooks R3F partagés
  shaders/          matériaux GLSL maison
  state/            état partagé de la scène (contexte React)
  config/           réglages 3D (positions, échelles, couleurs)
  ui/               surcouche HTML (billets, panneaux, tableau des départs)
  debug/            panneau Leva, chargé seulement avec #debug
public/models/      les fichiers .glb (aucun pour l'instant : tout est construit en code)
```

Trois règles :

1. Le code 3D reste dans `src/three/`. Les pages n'importent qu'un seul composant, `Experience`.
2. Les réglages 3D sont séparés du contenu : ils vont dans `src/three/config/`, pas dans les MDX.
3. Le contenu ne dépend pas de la 3D : le site doit fonctionner si `src/three/` est retiré.

Le fonctionnement détaillé de la scène (états, caméra, arrêts, mode debug) et les pistes pour la suite sont dans [docs/scene.md](docs/scene.md).

### Comment ça marche

1. Chaque projet est un fichier `content/projets/<slug>.mdx`. Le haut du fichier (entre les `---`) contient les infos structurées (titre, technos, rôle...), le bas est le texte de présentation.
2. `src/lib/projects.ts` lit tous ces fichiers, **vérifie** qu'ils sont complets et bien formés (schéma zod), et les trie selon le champ `order`.
3. La page d'accueil met la liste en scène (le tableau des départs du train, et la grille de sa version HTML), et `/projets/<slug>` affiche le détail. Toutes les pages sont générées au build (rapide, bon pour le SEO).

Si un fichier de projet est incorrect (champ manquant, mauvais type), le build s'arrête avec un message qui indique le fichier et le problème.

## Ajouter un projet

1. Copier un fichier existant de `content/projets/` sous un nouveau nom (ce nom devient l'URL : `nouveau.mdx` → `/projets/nouveau`).
2. Modifier les infos en haut et le texte en bas.
3. Déposer `thumb.png` et jusqu'à trois captures (`shot-1.jpg`...) dans `public/projets/nouveau/`, puis vérifier que les chemins `thumb` et `images` du fichier y pointent. La vignette sert aussi d'aperçu quand le lien de la page est partagé.
4. `npm run dev` pour vérifier le rendu.

Exemple de frontmatter :

```yaml
title: "Musée des Beaux-Arts de Reims"
summary: "Viewer 3D interactif pour les œuvres d'un musée."   # une ligne, affichée sur les cartes
type: pro                    # pro | perso
order: 2                     # position dans la liste
year: "2025"                 # optionnel : "2024–2025" pour une période
role: "développeur"
technos: ["react", "three", "r3f", "blender"]
clients: ["..."]             # optionnel
partners: ["..."]            # optionnel
tasks: ["Développement de l'interface"]
href: "https://..."          # optionnel : lien vers le projet en ligne
thumb: /projets/reims/thumb.png
images: [/projets/reims/shot-1.jpg, /projets/reims/shot-2.jpg]   # optionnel : captures, 3 au plus
```

La liste exacte des champs et leurs contraintes est dans le schéma de [src/lib/projects.ts](src/lib/projects.ts).

## Modifier le reste

- **Intro, compétences, liens de contact** : `src/lib/site.ts`
- **Mentions légales et crédits** : `content/pages/mentions-legales.mdx` (un nouvel élément 3D sous licence CC-BY doit y être crédité)
- **Couleurs et thème** : variables en haut de `src/app/globals.css`

## Workflow git

`main` est toujours propre et correspond à la production sur Vercel. On ne travaille jamais directement dessus.

1. **Créer une branche** depuis `main`, avec un préfixe selon le sujet :
   `content/...` (contenu), `feat/...` (fonctionnalité), `fix/...` (correction), `chore/...` (config, dépendances, doc).
2. **Commiter** avec le format `préfixe: description courte à l'impératif, en anglais`, par exemple `content: add the Configurateur project`.
   Préfixes : `feat`, `fix`, `content`, `style`, `refactor`, `chore`.

   **Langue :** tout ce qui touche à git est en anglais (commits, noms de branche sans accents ni espaces, titres et descriptions de PR). Le contenu du site et cette doc restent en français.
3. **Ouvrir une pull request**, même pour un petit changement de contenu. Vercel crée une URL de prévisualisation : on vérifie le rendu avant de fusionner.
4. **Vérifier** que `npm run build` et `npm run lint` passent.
5. **Fusionner en « squash merge »** (une branche = un commit propre sur `main`), puis supprimer la branche.

Les prototypes 3D vont sur des branches jetables (`feat/proto-monde`, `feat/proto-atelier`) : on garde celle qui plaît, on abandonne l'autre.

Pas de branche `develop`, pas de tags ni de changelog : trop lourd pour un portfolio.

## Pour les agents IA

Les conventions de travail sont dans [CLAUDE.md](CLAUDE.md).
