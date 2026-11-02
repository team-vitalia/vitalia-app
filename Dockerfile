# ---------- Etapa 1: compilar la versión web de Expo ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# EXPO_PUBLIC_* se incrusta al compilar, por eso es un build-arg.
# Esta URL la usa el NAVEGADOR, no el contenedor.
ARG EXPO_PUBLIC_API_URL=http://localhost:8000
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

RUN npx expo export --platform web

# ---------- Etapa 2: servir con nginx ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
