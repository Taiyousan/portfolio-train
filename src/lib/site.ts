export const site = {
  name: "Shams Benhamou",
  role: "Développeur front-end",
  headline: "Développeur front-end, React & Three.js",
  city: "Strasbourg",
  title: "Shams Benhamou, développeur front-end React / Three.js",
  description:
    "Développeur web fullstack spécialisé front-end, à Strasbourg. React, Next.js, Three.js et React Three Fiber.",
  intro: [
    "Je m'appelle Shams, j'ai 27 ans et je vis à Strasbourg.",
    "Je suis développeur web fullstack, spécialisé dans le développement front-end et la 3D sur le web.",
  ],
  education:
    "Diplômé d'un BUT Métiers du Multimédia et de l'Internet (MMI) de l'IUT de Troyes.",
  skills: [
    { label: "Au quotidien", items: ["React", "Next.js", "Tailwind CSS"] },
    { label: "Maîtrisé", items: ["Vue.js", "Three.js", "React Three Fiber"] },
    { label: "Déjà pratiqué", items: ["Symfony", "MySQL", "API Platform"] },
  ],
  links: {
    email: "shamsbenhamou@gmail.com",
    github: "https://github.com/Taiyousan",
    linkedin: "https://www.linkedin.com/in/shams-benhamou-07a385161",
    cv: "/doc/cv.pdf",
  },
} as const;

// The contact links as listed, the first one stressed.
export const contacts = [
  { label: "Email", href: `mailto:${site.links.email}` },
  { label: "CV (PDF)", href: site.links.cv },
  { label: "GitHub", href: site.links.github },
  { label: "LinkedIn", href: site.links.linkedin },
];
