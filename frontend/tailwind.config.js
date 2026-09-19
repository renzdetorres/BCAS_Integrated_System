/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1B4332",
          dark: "#123024",
          light: "#2D6A4F",
        },
        gold: {
          DEFAULT: "#D9A441",
          dark: "#B9852B",
          light: "#F1C876",
        },
        page: "#EEF1EC",
        status: {
          green: "#2F9E44",
          greenBg: "#E6F6EA",
          red: "#E03131",
          redBg: "#FDEBEC",
          amber: "#D9A441",
          amberBg: "#FBF3E1",
          gray: "#868E96",
          grayBg: "#EEF0F1",
          purple: "#7048E8",
          purpleBg: "#F0EBFC",
          blue: "#1C7ED6",
          blueBg: "#E7F3FC",
        },
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(27, 67, 50, 0.08), 0 1px 2px rgba(27, 67, 50, 0.06)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
