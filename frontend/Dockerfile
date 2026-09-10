# Hafif bir Node.js imajı kullanıyoruz
FROM node:22-alpine

# Konteyner içindeki çalışma dizinini ayarlıyoruz
WORKDIR /app

# Paket dosyalarını kopyalayıp kütüphaneleri kuruyoruz
COPY package.json package-lock.json* ./
RUN npm install

# Tüm React kodlarını kopyalıyoruz
COPY . .

# Projenin dışarıya açılacağı port (Vite kullanıyorsan genelde 5173, Create-React-App ise 3000'dir)
EXPOSE 3000

# Geliştirme sunucusunu başlatıyoruz (Vite için "npm run dev", klasik React için "npm start" yazabilirsin)
CMD ["npm", "start"]