# Multi-stage build для Slidev презентации

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Устанавливаем Slidev CLI глобально
RUN npm install -g @slidev/cli

# Копируем файлы зависимостей
COPY package.json package-lock.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходные файлы
COPY . .

# Собираем презентацию
RUN slidev build slides.md

# Stage 2: Production
FROM nginx:alpine

# Копируем собранные файлы
COPY --from=builder /app/dist /usr/share/nginx/html

# Экспонируем порт
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]

