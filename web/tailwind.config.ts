import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brass: { DEFAULT: "#B8893D", soft: "#FAF6EE", deep: "#8E6927" },
        ink: "#1F2937",
        slate900: "#0F172A",
      },
      fontFamily: {
        sans: ['"Inter Tight"', "Inter", "system-ui", "sans-serif"],
        serif: ['"Source Serif 4"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
