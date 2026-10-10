import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F6F1E7",
          deep: "#EDE6D6",
        },
        ink: {
          DEFAULT: "#141210",
          soft: "#5A544B",
          faint: "#A39B8C",
        },
        vermilion: {
          DEFAULT: "#E8431F",
          10: "#FBE9E4",
          20: "#F6D2C9",
          40: "#F0A593",
          60: "#EC7A5E",
          80: "#E85D3E",
        },
      },
      fontFamily: {
        display: [
          '"Bricolage Grotesque"',
          ...defaultTheme.fontFamily.sans,
        ],
        body: [
          '"Familjen Grotesk"',
          ...defaultTheme.fontFamily.sans,
        ],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderWidth: {
        "1.5": "1.5px",
      },
      borderRadius: {
        ticket: "6px",
      },
      boxShadow: {
        stamp: "3px 3px 0px 0px #141210",
        "stamp-sm": "2px 2px 0px 0px #141210",
        "stamp-vermilion": "3px 3px 0px 0px #E8431F",
      },
      spacing: {
        safe: "env(safe-area-inset-bottom)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
