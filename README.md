# Portfolio 2026

Portfolio de Shams Benhamou, développeur front-end (React, Next.js, Three.js / React Three Fiber).

**Idée directrice : le contenu d'abord.** Le site est un vrai site HTML, lisible en quelques secondes et utilisable sans WebGL. Une couche 3D interactive viendra se superposer plus tard, sans jamais remplacer ce contenu.

**Stack :** Next 16 (App Router) · React 19 · TypeScript · Tailwind 4 · MDX (`next-mdx-remote`) · zod

## Lancer le projet

```bash
npm install
npm run dev      # http://localhost:3100
npm run build    # build de production (vérifie aussi types et contenu)
npm run lint
```

## Comment c'est organisé

```
content/projets/       Un fichier .mdx par projet (le contenu)
public/projets/<nom>/  L'image (thumb.png) et la vidéo (video.mp4) du projet
public/doc/cv.pdf      Le CV
src/lib/projects.ts    Lit et valide les fichiers de content/projets
src/lib/site.ts        Textes globaux : intro, compétences, liens de contact
src/app/page.tsx       Page d'accueil
src/app/projets/[slug]/page.tsx   Page détail d'un projet
src/app/globals.css    Couleurs (clair/sombre) et styles globaux
```

### Où ranger quoi

On range par **nature de chose**, pas par page.

| Zone | Ce qu'on y met |
|---|---|
| `content/` | Du texte et des données que tu écris (projets, plus tard un blog...) |
| `public/` | Des fichiers bruts servis tels quels (images, vidéos, CV, `.glb`) |
| `src/app/` | Des pages : un dossier = une URL |
| `src/lib/` | De la logique sans affichage (lecture et validation du contenu) |
| `src/components/` | *(à créer quand besoin)* Morceaux d'interface réutilisables |
| `src/three/` | Tout ce qui touche à React Three Fiber (prototype du train, page `/proto/train`) |

**« Je veux ajouter... »**

- **Un projet** : `content/projets/x.mdx` + `public/projets/x/`. Aucun code.
- **Une page** (ex. `/a-propos`) : `src/app/a-propos/page.tsx`. Le nom du dossier devient l'URL. Si le texte est long, le mettre en MDX dans `content/`.
- **Un morceau d'interface utilisé à plusieurs endroits** : `src/components/`. Par exemple la carte de projet, aujourd'hui écrite dans `page.tsx` : à extraire seulement quand une deuxième page en a besoin.
- **Un nouveau type de contenu** (blog, expériences) : un dossier dans `content/`, un schéma et un lecteur dans `src/lib/` (sur le modèle de `projects.ts`), puis les pages.
- **Du texte global** (intro, liens) : `src/lib/site.ts`.
- **Un modèle 3D** : `public/models/x.glb`.
- **Une couleur ou un style global** : `src/app/globals.css`.

**Pour trancher** : du texte que tu rédiges → `content/` ; un fichier lourd → `public/` ; une URL → `src/app/` ; de la logique ou de l'affichage réutilisable → `src/lib/` ou `src/components/`.

### Structure de la 3D

```
src/three/
  Experience.tsx    le <Canvas> unique, chargé côté client
  scenes/           une scène par projet ou par zone
  models/           composants 3D (chargent un .glb ou le construisent)
  hooks/            hooks R3F partagés
  state/            état partagé de la scène (contexte React)
  config/           réglages 3D (positions, échelles)
public/models/      les fichiers .glb
```

Trois règles :

1. Le code 3D reste dans `src/three/`. Les pages n'importent qu'un seul composant, `Experience`.
2. Les réglages 3D sont séparés du contenu : les anciens `positionX` / `scale` iront dans `src/three/config/`, pas dans les MDX.
3. Le contenu ne dépend pas de la 3D : le site doit fonctionner si `src/three/` est retiré.

### Comment ça marche

1. Chaque projet est un fichier `content/projets/<slug>.mdx`. Le haut du fichier (entre les `---`) contient les infos structurées (titre, technos, rôle...), le bas est le texte de présentation.
2. `src/lib/projects.ts` lit tous ces fichiers, **vérifie** qu'ils sont complets et bien formés (schéma zod), et les trie selon le champ `order`.
3. La page d'accueil affiche la liste, et `/projets/<slug>` affiche le détail. Toutes les pages sont générées au build (rapide, bon pour le SEO).

Si un fichier de projet est incorrect (champ manquant, mauvais type), le build s'arrête avec un message qui indique le fichier et le problème.

## Ajouter un projet

1. Copier un fichier existant de `content/projets/` sous un nouveau nom (ce nom devient l'URL : `nouveau.mdx` → `/projets/nouveau`).
2. Modifier les infos en haut et le texte en bas.
3. Déposer `thumb.png` (et optionnellement `video.mp4`) dans `public/projets/nouveau/`, puis vérifier que les chemins `thumb` et `video` du fichier y pointent.
4. `npm run dev` pour vérifier le rendu.

Exemple de frontmatter :

```yaml
title: "Musée des Beaux-Arts de Reims"
summary: "Viewer 3D interactif pour les œuvres d'un musée."   # une ligne, affichée sur les cartes
type: pro                    # pro | perso
order: 2                     # position dans la liste
role: "développeur"
technos: ["react", "three", "r3f", "blender"]
clients: ["..."]             # optionnel
partners: ["..."]            # optionnel
tasks: ["Développement de l'interface"]
href: "https://..."          # optionnel : lien vers le projet en ligne
thumb: /projets/reims/thumb.png
video: /projets/reims/video.mp4   # optionnel
```

La liste exacte des champs et leurs contraintes est dans le schéma de [src/lib/projects.ts](src/lib/projects.ts).

## Modifier le reste

- **Intro, compétences, liens de contact, CV** : `src/lib/site.ts`
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

## Pour la suite

- Ajouter la couche 3D (React Three Fiber) par-dessus le contenu, avec un bouton pour la désactiver.
- Les modèles `.glb` de l'ancien portfolio sont dans `../portfolio-responsive/public/models/`.

## Pour les agents IA

Les conventions de travail sont dans [CLAUDE.md](CLAUDE.md).
