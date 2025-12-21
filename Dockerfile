# Multi-stage build для Slidev презентации

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package.json package-lock.json ./

# Устанавливаем зависимости (используем install вместо ci для совместимости)
RUN npm install

# Копируем исходные файлы
COPY . .

# Собираем презентацию используя npx (не требует глобальной установки)
# Slidev build создает статическую SPA версию
RUN npx slidev build slides.md

# Stage 2: Production
FROM nginx:alpine

# Копируем собранные файлы
COPY --from=builder /app/dist /usr/share/nginx/html

# Экспонируем порт
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]

