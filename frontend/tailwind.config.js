/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0f172a', // En soldaki ince menünün koyu laciverti
        'brand-blue': '#1d4ed8', // New Chat butonu mavisi
        'chat-gray': '#f1f5f9',  // Mesaj balonlarının açık grisi
        'chat-icon': '#10b981',  // Bot ikonunun yeşili
      }
    },
  },
  plugins: [],
}