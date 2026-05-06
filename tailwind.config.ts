import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        washi: "#f5efe3",
        shuiro: "#c0392b",
        mizu: "#2980b9",
        sumi: "#161616",
        ink: "#2d2926",
        cream: "#fffaf1",
        sand: "#e7ddd0",
        mist: "#fbf7f0",
        brand: "#1a73e8",
        cloud: "#eef4ff",
        line: "#dbe3ef",
        slate: "#667085",
      },
      boxShadow: {
        pop: "6px 6px 0 0 #000",
        "pop-sm": "4px 4px 0 0 #000",
        soft: "0 12px 30px rgba(15, 23, 42, 0.07)",
        elevated: "0 24px 56px rgba(15, 23, 42, 0.09)",
      },
      fontFamily: {
        heading: "var(--font-heading)",
        body: "var(--font-body)",
      },
      keyframes: {
        "live-blink": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".35", transform: "scale(.8)" },
        },
      },
      animation: {
        "live-blink": "live-blink 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
