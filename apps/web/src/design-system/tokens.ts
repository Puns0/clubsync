// ─── Design tokens (mirrors tailwind.config / CSS variables) ───
// Import these in code that needs token values outside of Tailwind classes.

export const colors = {
  paper: "#F6F1E7",
  paperDeep: "#EDE6D6",
  ink: "#141210",
  inkSoft: "#5A544B",
  inkFaint: "#A39B8C",
  vermilion: "#E8431F",
  vermilion10: "#FBE9E4",
  vermilion20: "#F6D2C9",
  vermilion40: "#F0A593",
  vermilion60: "#EC7A5E",
  vermilion80: "#E85D3E",
} as const;

export const fonts = {
  display: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
  body: '"Familjen Grotesk", ui-sans-serif, system-ui, sans-serif',
} as const;

export const radii = {
  sm: "4px",
  md: "6px",
  lg: "8px",
  full: "9999px",
} as const;

export const shadows = {
  stamp: "3px 3px 0px 0px #141210",
  stampSm: "2px 2px 0px 0px #141210",
  stampVermilion: "3px 3px 0px 0px #E8431F",
} as const;
