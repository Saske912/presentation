# Docker для Slidev презентации

## Сборка и запуск

### Production (статическая сборка)

```bash
# Сборка образа
docker build -t slidev-presentation .

# Запуск контейнера
docker run -d -p 8080:80 --name slidev slidev-presentation

# Откройте в браузере: http://localhost:8080
```

### Development (dev сервер с hot reload)

```bash
# Сборка dev образа
docker build -f Dockerfile.dev -t slidev-presentation:dev .

# Запуск dev контейнера
docker run -d -p 3030:3030 --name slidev-dev slidev-presentation:dev

# Откройте в браузере: http://localhost:3030
```

## Docker Compose

Создайте `docker-compose.yml`:

```yaml
version: '3.8'

services:
  slidev:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    restart: unless-stopped

  slidev-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3030:3030"
    volumes:
      - .:/app
      - /app/node_modules
    restart: unless-stopped
```

Запуск:
```bash
# Production
docker-compose up slidev

# Development
docker-compose up slidev-dev
```

## Остановка

```bash
# Остановить контейнер
docker stop slidev

# Удалить контейнер
docker rm slidev

# Удалить образ
docker rmi slidev-presentation
```

