# Portfolio train

Portfolio de Shams Benhamou, développeur web fullstack spécialisé front-end et 3D.

Un train traverse une forêt en 3D ; chaque arrêt mène à une section du site. Sous la scène, une version HTML pour les lecteurs d'écran, les moteurs de recherche et les appareils qui ne suivent pas.

**Stack :** Next.js 16 · React 19 · TypeScript · React Three Fiber · GLSL · Tailwind CSS 4 · MDX · zod

## Lancer

```bash
npm install
npm run dev     # http://localhost:3100 (#debug : réglages 3D)
npm run build
```

## Organisation

```
content/projets/   un projet par fichier .mdx
public/projets/    images des projets
src/app/           pages
src/lib/           lecture du contenu, textes du site
src/three/         la scène 3D (détails : docs/scene.md)
```

Conventions de travail : [CLAUDE.md](CLAUDE.md).
