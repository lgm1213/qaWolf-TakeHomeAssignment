FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN mkdir -p data/reports

EXPOSE 3000

CMD ["node", "dashboard/server.js"]
