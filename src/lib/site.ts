export const site = {
  name: "Shams Benhamou",
  role: "Développeur fullstack",
  headline: "Développeur web fullstack, spécialisé front-end et 3D",
  city: "Strasbourg",
  title: "Shams Benhamou, développeur fullstack React / Three.js",
  description:
    "Développeur web fullstack à Strasbourg, spécialisé front-end et 3D temps réel : React, TypeScript, Laravel, Three.js et React Three Fiber.",
  intro: [
    "Développeur web fullstack à Strasbourg, je conçois des interfaces et des expériences 3D interactives pour le web.",
    "En CDI depuis 2025 chez un éditeur de logiciel SaaS pour la rénovation énergétique, je travaille au quotidien avec React, TypeScript et Laravel. Avant cela, j'ai passé près de deux ans chez Okénite à développer des jumeaux numériques, des visionneuses 3D et des cartes interactives.",
    "À côté, je continue d'explorer la 3D temps réel à travers des projets personnels, comme ce portfolio.",
  ],
  education:
    "Diplômé d'un BUT Métiers du Multimédia et de l'Internet (MMI) de l'IUT de Troyes.",
  skills: [
    {
      label: "Front-end",
      items: ["TypeScript", "React", "Next.js", "Tailwind CSS", "Vue.js"],
    },
    { label: "Back-end", items: ["PHP", "Laravel", "Symfony", "API Platform"] },
    {
      label: "3D temps réel",
      items: ["Three.js", "React Three Fiber", "GLSL", "Blender"],
    },
  ],
  links: {
    email: "shamsbenhamou@gmail.com",
    github: "https://github.com/Taiyousan",
    linkedin: "https://www.linkedin.com/in/shams-benhamou-07a385161",
  },
} as const;

// The contact links as listed, the first one stressed.
export const contacts = [
  { label: "Email", href: `mailto:${site.links.email}` },
  { label: "GitHub", href: site.links.github },
  { label: "LinkedIn", href: site.links.linkedin },
];
