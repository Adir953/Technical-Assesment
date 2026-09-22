FROM node:24-alpine

# Instalar OpenJDK 17 en la imagen base de Node
RUN apk add --no-cache openjdk17-jdk

# Usuario sin privilegios que ejecuta el código del candidato (uid distinto en cada runner, porque
# el límite nproc se cuenta por uid en todo el kernel): sin home, sin shell de login y
# sin permisos de escritura (el contenedor es de solo lectura y /tmp solo lo escribe root).
RUN addgroup -S -g 10003 sandbox \
 && adduser -S -D -H -u 10003 -G sandbox -s /sbin/nologin sandbox

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

COPY src/ ./src/

# Solo root puede leer el código del servidor; el usuario sandbox no ve /app.
RUN npm run build \
 && npm prune --omit=dev \
 && chmod -R go-rwx /app

ENV SANDBOX_UID=10003 SANDBOX_GID=10003

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=20s \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# El servidor corre como root solo para poder lanzar procesos como el usuario sandbox;
# docker-compose le quita todas las capabilities excepto SETUID, SETGID y KILL.
CMD ["node", "dist/runner.js"]
