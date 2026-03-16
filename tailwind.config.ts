import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // GoFlexxi brand palette
        brand: {
          50:  "#edfcf4",
          100: "#d3f8e4",
          200: "#a9f0cc",
          300: "#6fe3ae",
          400: "#33ce8c",
          500: "#0fb374",  // primary green
          600: "#059160",
          700: "#06734e",
          800: "#085c40",
          900: "#084c36",
          950: "#032b1f",
        },
        navy: {
          50:  "#f0f3ff",
          100: "#e4e9ff",
          200: "#cdd6ff",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#1e3a5f",  // primary navy
          600: "#162d4a",
          700: "#0f2138",
          800: "#0a1628",
          900: "#060e1a",
          950: "#030812",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
