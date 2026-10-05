/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sampled from the provided Maersk brand swatch.
        maersk: {
          50:  "#eaf6fb",
          100: "#c9e7f1",
          200: "#a6d6e6",
          300: "#7ec2d9",
          400: "#5ab6d1",
          500: "#3da8cc",   // brand cyan
          600: "#2f8bab",
          700: "#256f88",
          800: "#1b5266",
          900: "#0e2f3d",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
