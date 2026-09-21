FROM node:24-alpine

# Instalar OpenJDK 17 en la imagen base de Node
RUN apk add --no-cache openjdk17-jdk

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

COPY src/ ./src/

RUN npm run build

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=20s \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/runner.js"]
