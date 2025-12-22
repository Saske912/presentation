# Архитектура платформы Rigspace

## Обзор

Платформа **Rigspace** представляет собой комплексную микросервисную систему, развернутую в **Docker Swarm** и управляемую через **Terraform**. Система обеспечивает обработку данных скважин, мониторинг, аналитику и отчетность для нефтегазовой отрасли.

## Технологический стек

- **Оркестрация**: Docker Swarm
- **Инфраструктура как код**: Terraform (провайдер `kreuzwerker/docker`)
- **Reverse Proxy**: Traefik
- **Мониторинг**: Prometheus, Grafana, Alloy
- **Логирование**: Loki
- **Трассировка**: Tempo
- **Базы данных**: MariaDB, MongoDB, Redis, ClickHouse, Elasticsearch
- **Очереди сообщений**: NATS, RabbitMQ
- **Языки**: Java (Spring Boot), Python

---

## Сетевая архитектура

### Docker Overlay сети

Платформа использует две основные overlay-сети:

1. **`traefik-public`** (внешняя сеть)
   - Публичная сеть для ingress-трафика
   - Подключены все сервисы, доступные извне через Traefik
   - Используется для маршрутизации HTTP/HTTPS запросов

2. **`${project_name}-internal`** (изолированная внутренняя сеть)
   - Приватная сеть для межсервисного взаимодействия
   - Используется для доступа к базам данных и внутренним API
   - Обеспечивает изоляцию сервисов от внешнего трафика

**Принцип подключения**: Большинство сервисов подключены к обеим сетям одновременно:
- `traefik-public` — для внешнего доступа через Traefik
- `isolated_internal` — для внутренней коммуникации

---

## Слои архитектуры

### 1. Слой Ingress (Входной шлюз)

#### Traefik (Reverse Proxy)

**Файл**: `proxy.tf`

**Роль**: Единая точка входа для всех HTTP/HTTPS запросов

**Характеристики**:
- Публикует порты **80** (HTTP) и **443** (HTTPS) на всех узлах Swarm
- Автоматическое обнаружение сервисов через Docker API (`/var/run/docker.sock`)
- Динамическая маршрутизация на основе Docker labels
- Автоматическое управление TLS-сертификатами через Cloudflare DNS API
- Хранение ACME-сертификатов в volume `traefik_acme`

**Конфигурация**:
- Основной конфиг: `configs/traefik.conf.tpl`
- Middlewares: `configs/traefik/middlewares.yml`

**Маршрутизация**:
Все сервисы регистрируются в Traefik через labels:
```
traefik.http.routers.{service}.rule = "Host(`{domain}`) && PathPrefix(`/{path}`)"
traefik.http.routers.{service}.entrypoints = "web_secure"
traefik.http.routers.{service}.tls.certresolver = "prod_resolver"
```

---

### 2. Слой конфигурации

#### Config Server (Spring Cloud Config)

**Файл**: `config-server.tf`

**Роль**: Централизованное управление конфигурацией всех микросервисов

**Архитектура**:
- Хранит конфигурации всех сервисов в виде Docker Secrets
- Каждый сервис имеет свой конфиг-файл (YAML):
  - `admin.yml`
  - `analytics.yml`
  - `authentication.yml`
  - `drive.yml`
  - `monitoring.yml`
  - `monitoring-service.yml`
  - `reporting.yml`
  - `application.yml` (общий для всех)
  - `mapping-service.yml`

**Механизм работы**:
1. Terraform генерирует секреты из шаблонов (`configs/config-server/*.yml.tpl`)
2. Config Server монтирует секреты как файлы
3. Микросервисы подключаются к Config Server через `CLOUD_CONFIG_USERNAME/PASSWORD`
4. Сервисы получают конфигурацию при старте и обновляют её динамически

**Размещение**: Узел с label `node.labels.rig.space.modules == true`

---

### 3. Слой приложений (Core Services)

Все основные сервисы Rigspace следуют единому паттерну развертывания:

#### Общие характеристики сервисов

- **Порт**: 8080 (внутренний), проксируется через Traefik
- **Healthcheck**: HTTP `/health` endpoint
- **Ресурсы**: 
  - Memory limit: 1-4 GB (зависит от сервиса)
  - Memory reservation: 256 MB - 1 GB
- **Volumes**:
  - `rig_space_user_files` — пользовательские файлы
  - `logdata_cache` — кеш логов
- **Сети**: `traefik_public` + `isolated_internal`
- **Размещение**: Узлы с `node.labels.edu1 == true` (основные сервисы)

#### Rigspace Authentication

**Файл**: `rigspace-authentication.tf`

**Роль**: Сервис аутентификации и авторизации

**Маршруты**:
- `/` → редирект на `/auth`
- `/auth` → основной endpoint аутентификации

**Зависимости**:
- Config Server
- Rigspace MariaDB
- Secrets: `application_service_secret`, `authentication_service_secret`

**Ресурсы**: 1-4 GB RAM

---

#### Rigspace Admin

**Файл**: `rigspace-admin.tf`

**Роль**: Административный интерфейс платформы

**Маршрут**: `/admin`

**Зависимости**:
- Config Server
- Rigspace MariaDB
- Stream MariaDB

**Ресурсы**: 1-4 GB RAM

---

#### Rigspace Monitoring

**Файл**: `rigspace-monitoring.tf`

**Роль**: Интерфейс мониторинга скважин и оборудования

**Маршрут**: `/monitoring`

**Особенности**:
- Поддержка новых алертов (`RSM_FRONT_ALARMS_V2`)
- Поддержка расчетных параметров (`CALCULATED_PARAMS_SUPPORTED`)

**Зависимости**:
- Config Server
- Rigspace MariaDB
- Stream MariaDB
- Stream Service

**Ресурсы**: 1-4 GB RAM

---

#### Rigspace Analytics

**Файл**: `rigspace-analytics.tf`

**Роль**: Аналитический модуль для обработки данных

**Маршрут**: `/analytics`

**Особенности**:
- Включен dashboard проектов (`DASHBOARD_PROJECT_STATUS_ENABLED`)

**Ресурсы**: 2-4 GB RAM (увеличенные для аналитики)

---

#### Rigspace Reporting

**Файл**: `rigspace-reporting.tf`

**Роль**: Генерация отчетов и документов

**Маршрут**: `/reporting`

**Особенности**:
- Кастомная конфигурация логирования через `reporting.log.xml`
- Настраиваемые уровни логирования для различных компонентов
- Опциональный dashboard проектов

**Ресурсы**: 2-8 GB RAM (максимальные для генерации отчетов)

---

#### Rigspace Drive

**Файл**: `rigspace-drive.tf`

**Роль**: Файловое хранилище и управление документами

**Маршрут**: `/drive`

**Ресурсы**: 512 MB - 2 GB RAM

---

### 4. Слой потоковой обработки данных

#### Stream Service (GTI Online Stream)

**Файл**: `stream.tf`

**Роль**: Обработка потоковых данных со скважин в реальном времени

**Архитектура**:
- Основной API: порт **9182** → маршрут `/stream`
- Health endpoint: порт **5342** → маршрут `/health`

**Конфигурация**:
- `parser.conf` — конфигурация парсера (БД, NATS)
- `.cfg` — общая конфигурация
- `WITSMLClient/*/configuration.xml` — конфигурации WITSML-клиентов
- `connects_config.json` — конфигурация connect-сервисов

**WITSML интеграция**:
- Поддержка множественных WITSML-источников
- Конфигурация через переменную `var.stream.witsml[]`
- Каждый источник имеет свой `well_id`, `url`, `user`, `password`, `product_key`

**Connect сервисы**:
- Регистрация production и test connect-сервисов
- Автоматическая регистрация через `connect_registrator` (init-контейнер)
- Python-скрипт регистрации: `scripts/register_connects.py`

**Volumes**:
- `stream_data` — данные потоков

**Размещение**: Узел с `node.labels.edu2 == true`

**Ресурсы**: 1-4 GB RAM

---

#### Connect Registrator

**Файл**: `stream.tf`

**Роль**: Инициализатор регистрации connect-сервисов

**Механизм**:
1. Запускается после старта Stream Service
2. Читает конфигурацию из переменных `var.services.connects` и `var.services.wits_test_system.generators`
3. Регистрирует каждый connect через HTTP API Stream Service
4. Завершается после успешной регистрации (`restart_policy.condition = "none"`)

**Зависимости**: Stream Service, Stream MariaDB

---

#### Axis2 Server

**Файл**: `stream.tf`

**Роль**: SOAP-сервер для интеграций

**Маршрут**: `/axis2`

**Размещение**: Узел с `node.labels.edu2 == true`

---

### 5. Слой баз данных

#### Rigspace MariaDB

**Файл**: `databases.tf`

**Роль**: Основная реляционная БД для платформы

**Использование**:
- Хранение пользовательских данных
- Данные проектов, скважин, оборудования
- Используется всеми основными сервисами Rigspace

**Volumes**: `rigspace_mariadb_data`

**Размещение**: Узел с `node.labels.edu1 == true`

---

#### Stream MariaDB

**Файл**: `databases.tf`

**Роль**: БД для потоковых данных

**Использование**:
- Хранение данных со скважин
- Логи потоков
- Используется Stream Service и связанными сервисами

**Volumes**: `stream_mariadb_data`

**Размещение**: Узел с `node.labels.edu2 == true`

**Особенности**:
- Кастомный образ `stream-mariadb`
- Запуск от пользователя `mysql` (не root)

---

#### Дополнительные БД

- **MongoDB** (`mongodb.tf`): Документо-ориентированная БД
- **Redis** (`redis.tf`): Кеш и очереди
- **ClickHouse** (`clickhouse.tf`): Аналитическая БД для временных рядов
- **Elasticsearch** (`elasticsearch.tf`): Поиск и индексация

---

### 6. Слой очередей сообщений

#### NATS

**Файл**: `nats.tf`

**Роль**: Легковесный брокер сообщений

**Использование**:
- Потоковая обработка данных
- Event-driven архитектура
- Интеграция с Stream Service

---

#### NATS Stream

**Файл**: `nats.tf`

**Роль**: Расширенная версия NATS с персистентностью

**Использование**: Долгосрочное хранение потоков событий

---

#### RabbitMQ

**Файл**: `rabbitmq.tf`

**Роль**: Полнофункциональный брокер сообщений

**Использование**: Асинхронная обработка задач, очереди

---

### 7. Слой мониторинга и наблюдаемости

#### Prometheus

**Файл**: `prometheus.tf`

**Роль**: Сбор метрик и мониторинг

**Характеристики**:
- Маршрут: `/prometheus`
- Порт: 9090
- Service discovery через Docker labels (`prometheus_job_rigspace_module`)
- Правила алертинга: `configs/monitoring/alerting-rules.yml.tpl`
- Retention настраивается через переменные

**Volumes**: `prometheus_data`

**Метрики**:
- Все Rigspace сервисы экспортируют метрики
- Метрики БД и инфраструктуры
- Кастомные бизнес-метрики

---

#### Loki

**Файл**: `logging.tf`

**Роль**: Агрегация и хранение логов

**Характеристики**:
- Сбор логов из всех контейнеров
- Retention настраивается
- Интеграция с Grafana для визуализации

**Конфигурация**: `configs/logging/loki-config.yml.tpl`

---

#### Grafana

**Файл**: `grafana.tf`

**Роль**: Визуализация метрик и логов

**Источники данных**:
- Prometheus (метрики)
- Loki (логи)
- Tempo (трейсы)

---

#### Alloy

**Файл**: `alloy.tf`

**Роль**: Агент сбора метрик и логов

**Функции**:
- Сбор метрик с различных источников
- Forwarding в Prometheus/Loki
- Обработка и трансформация данных

---

#### Tempo

**Файл**: `tempo.tf`

**Роль**: Распределенная трассировка

**Использование**: Отслеживание запросов через микросервисы

---

### 8. Вспомогательные сервисы

#### Monitoring Service

**Файл**: `monitoring-service.tf`

**Роль**: Backend-сервис для мониторинга

**Функции**:
- Обработка данных мониторинга
- Интеграция с БД и очередями
- API для Rigspace Monitoring

---

#### Mail Server

**Файл**: `mail-server.tf`

**Роль**: SMTP-сервер для отправки уведомлений

**Использование**: Email-уведомления, отчеты

---

#### Portainer

**Файл**: `portainer.tf`

**Роль**: Web-интерфейс для управления Docker Swarm

---

#### WITSML Generator

**Файл**: `witsml-gen.tf`

**Роль**: Генератор тестовых WITSML-данных

**Использование**: Тестирование и разработка

---

## Управление ресурсами

### Volumes

Все volumes определены в `volumes.tf` и используют именованные Docker volumes:

- `rig_space_user_files` — пользовательские файлы (общий для всех сервисов)
- `logdata_cache` — кеш логов (общий)
- `rigspace_mariadb_data` — данные Rigspace БД
- `stream_mariadb_data` — данные Stream БД
- `prometheus_data` — метрики Prometheus
- `stream_data` — данные потоков
- `traefik_acme` — TLS-сертификаты

**Режимы хранения**:
- **Shared Storage** (`var.shared_storage = true`): Используется общее хранилище (NFS, Ceph)
- **Local Storage** (`var.shared_storage = false`): Локальные volumes с placement constraints

Подробнее см. `SHARED_STORAGE.md`

---

### Secrets и Configs

**Docker Secrets**:
- Генерируются из шаблонов Terraform
- Хранят конфигурации сервисов, пароли, токены
- Монтируются в контейнеры как файлы

**Docker Configs**:
- Статические конфигурационные файлы
- Не содержат секретной информации
- Обновляются через lifecycle hooks

**Lifecycle**:
- `replace_triggered_by` — автоматический перезапуск при изменении секретов
- `ignore_changes = [name]` — игнорирование изменений timestamp в имени

---

## Размещение сервисов (Placement)

### Узлы с `node.labels.edu1 == true`

Основные сервисы платформы:
- Rigspace Authentication
- Rigspace Admin
- Rigspace Monitoring
- Rigspace Analytics
- Rigspace Reporting
- Rigspace Drive
- Config Server
- Prometheus
- Traefik
- Rigspace MariaDB

### Узлы с `node.labels.edu2 == true`

Потоковые и интеграционные сервисы:
- Stream Service
- Axis2 Server
- Stream MariaDB

### Узлы с `node.labels.rig.space.modules == true`

Специализированные модули:
- Config Server

**Примечание**: При `var.shared_storage = true` placement constraints не применяются

---

## Обновление и развертывание

### Стратегия обновления

Все сервисы используют `update_config`:
- **Parallelism**: 1-2 (количество одновременных обновлений)
- **Delay**: 5-15 секунд между обновлениями
- **Order**: `stop-first` (сначала останавливается старая версия)
- **Failure action**: `pause` (приостановка при ошибке)
- **Monitor**: 30 секунд мониторинга после обновления

### Healthchecks

- **Interval**: 25-30 секунд
- **Timeout**: 2 секунды
- **Start period**: 
  - 300 секунд при `isInitialInstall = true`
  - 30-90 секунд в обычном режиме
- **Retries**: 6 попыток

### Restart Policy

- **Condition**: `on-failure`
- **Delay**: 5-10 секунд
- **Max attempts**: 3
- **Window**: 1 минута

---

## Безопасность

### TLS/HTTPS

- Все внешние endpoints используют HTTPS
- Автоматическое управление сертификатами через Cloudflare DNS API
- Сертификаты хранятся в volume `traefik_acme`

### Секреты

- Все пароли и токены хранятся в Docker Secrets
- Секреты не попадают в логи или переменные окружения
- Монтируются как файлы в контейнеры

### Сетевая изоляция

- Внутренние сервисы доступны только через `isolated_internal` сеть
- Внешний доступ только через Traefik
- Базы данных доступны только из внутренней сети

---

## Масштабирование

### Горизонтальное масштабирование

- Все сервисы работают в режиме `replicated` с `replicas = 1`
- Для масштабирования можно увеличить количество реплик
- Traefik автоматически балансирует нагрузку между репликами

### Вертикальное масштабирование

- Настройка через переменные `var.services.*.memory_limit`
- Java-сервисы используют `JAVA_OPTS` для управления heap
- Ресурсы ограничены через `resources.limits`

---

## Зависимости между сервисами

### Порядок запуска

1. **Инфраструктура**:
   - Сети (Docker networks)
   - Volumes
   - Secrets и Configs

2. **Базовые сервисы**:
   - Config Server (зависит от secrets)
   - Базы данных (MariaDB, MongoDB, Redis и т.д.)
   - Очереди сообщений (NATS, RabbitMQ)

3. **Мониторинг**:
   - Prometheus
   - Loki
   - Grafana

4. **Основные сервисы**:
   - Rigspace Authentication (зависит от Config Server)
   - Rigspace Admin
   - Rigspace Monitoring
   - Rigspace Analytics
   - Rigspace Reporting
   - Rigspace Drive

5. **Потоковые сервисы**:
   - Stream Service (зависит от Stream MariaDB, NATS)
   - Connect Registrator (зависит от Stream Service)
   - Axis2

### Явные зависимости

Определены через `depends_on`:
- Все Rigspace сервисы зависят от `config_server`
- Stream Service зависит от `stream_mariadb`
- Connect Registrator зависит от `gti_online_stream`

---

## Переменные и конфигурация

### Основные переменные

Определены в `variables.tf`:

- `project_name` — имя проекта
- `domain_name` — доменное имя
- `docker_registry_url` — URL Docker registry
- `docker_registry` — credentials для registry
- `shared_storage` — использование общего хранилища
- `isInitialInstall` — флаг первичной установки
- `services.*` — конфигурация каждого сервиса

### Конфигурация сервисов

Каждый сервис имеет структуру:
```hcl
services.<service_name> = {
  enabled = bool
  version = string
  # дополнительные параметры
}
```

---

## Мониторинг и алертинг

### Метрики

Все сервисы экспортируют метрики через:
- Prometheus endpoints
- Docker labels `prometheus_job_rigspace_module`

### Алерты

Определены в `configs/monitoring/alerting-rules.yml.tpl`:
- Алерты на недоступность сервисов
- Алерты на метрики БД
- Алерты на ресурсы (CPU, память)
- Бизнес-метрики (если применимо)

### Логирование

- Все контейнеры используют `json-file` драйвер
- Логи собираются в Loki
- Максимальный размер лог-файла: 10 GB
- Ротация: 3 файла

---

## Резервное копирование

### Volumes

- Рекомендуется регулярное резервное копирование volumes БД
- Особое внимание: `rigspace_mariadb_data`, `stream_mariadb_data`

### Конфигурация

- Все конфигурации хранятся в Terraform state
- Secrets хранятся в Docker Secrets (рекомендуется внешнее хранилище)

---

## Устранение неполадок

### Проверка статуса сервисов

```bash
docker service ls
docker service ps <service_name>
docker service logs <service_name>
```

### Проверка healthcheck

```bash
curl https://<domain>/health
curl https://<domain>/<service>/health
```

### Проверка сетей

```bash
docker network ls
docker network inspect <network_name>
```

### Проверка volumes

```bash
docker volume ls
docker volume inspect <volume_name>
```

---

## Дальнейшее развитие

### Планируемые улучшения

- Горизонтальное масштабирование сервисов
- Автоматическое масштабирование на основе метрик
- Улучшенная обработка ошибок и retry-логика
- Расширенная интеграция с внешними системами

---

## Дополнительная документация

- `SHARED_STORAGE.md` — документация по общему хранилищу
- `scripts/ARCHITECTURE.md` — дополнительная архитектурная документация
- `scripts/README.md` — описание скриптов управления

---

## Контакты и поддержка

Для вопросов по архитектуре и развертыванию обращайтесь к команде разработки платформы Rigspace.

