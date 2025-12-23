---
theme: ./themes/custom
layout: cover
background: '#1e1e1e'
class: text-center
highlighter: shiki
lineNumbers: false
info: |
  ## Единая инфраструктурная платформа
  Kubernetes + Docker Swarm для масштабируемых бизнес-решений
drawings:
  persist: false
transition: slide-left
title: Единая инфраструктурная платформа
mdc: true
contextMenu: false
---

# Единая инфраструктурная платформа

## Kubernetes + Docker Swarm

**Централизованная Kubernetes-платформа**  
**+ распределённые Swarm-кластеры для бизнес-приложений**

---

# Содержание

1. Введение и концепция
2. Общая архитектура платформы
3. Центральная Kubernetes-инфраструктура
4. Rigspace Platform (Docker Swarm)
5. Интеграция и взаимодействие
6. Безопасность и управление доступом
7. Мониторинг и наблюдаемость
8. Эксплуатация и масштабирование
9. Заключение

---

# Введение

## Концепция платформы

**Двухуровневая архитектура:**

- **Kubernetes** — центральная платформа управления
  - Инфраструктурные сервисы (DNS, TLS, CI/CD, мониторинг)
  - Централизованное управление идентификацией и секретами
  - Единая точка наблюдения и логирования

- **Docker Swarm** — бизнес-приложения на площадках
  - Rigspace и другие платформы
  - Распределённые кластеры для разных локаций
  - Автономная работа с интеграцией в центральную платформу

---

# Введение

## Цели проекта

- **Единая платформа** для инфраструктурных и бизнес-систем (Kubernetes + Swarm)
- **Полная автоматизация**: DNS, TLS, развертывание, backup, мониторинг
- **Безопасность по умолчанию**: централизованная аутентификация и управление секретами
- **Наблюдаемость**: сквозной мониторинг и логирование для всех площадок
- **Масштабируемость**: простое добавление новых площадок и сервисов
- **Упрощение эксплуатации**: всё описано декларативно (Terraform/OpenTofu, GitOps)

---

# Введение

## Преимущества архитектуры

### Для бизнеса
- **Масштабируемость** — легко добавлять новые площадки
- **Единые стандарты** — централизованные политики безопасности
- **Наблюдаемость** — общая картина всех систем
- **Надёжность** — изоляция площадок, централизованный backup

### Для технических команд
- **Автоматизация** — Infrastructure as Code, GitOps
- **Безопасность** — централизованная аутентификация, управление секретами
- **Мониторинг** — единая платформа для метрик и логов
- **Упрощённое управление** — декларативная конфигурация

---

# Общая архитектура платформы

```mermaid
graph TB
    subgraph "Central Kubernetes Platform"
        subgraph "Infrastructure Services"
            BIND9[BIND9 DNS]
            CERT_MGR[Cert-Manager]
            METALLB[MetalLB]
            INGRESS[Ingress Nginx]
        end
        
        subgraph "Identity & Security"
            LDAP[OpenLDAP]
            VAULT[Vault]
            ESO[External Secrets]
            KYVERNO[Kyverno]
            BOUNDARY[Boundary]
        end
        
        subgraph "Storage & CI/CD"
            PG[PostgreSQL]
            HARBOR[Harbor Registry]
            FORGEJO[Forgejo Git]
            ARGOCD[ArgoCD GitOps]
        end
        
        subgraph "Monitoring & Observability"
            PROM[Prometheus]
            THANOS[Thanos]
            LOKI[Loki]
            GRAFANA[Grafana]
        end
        
        subgraph "Backup"
            VELERO[Velero]
        end
    end
    
    subgraph "Docker Swarm Clusters"
        subgraph "Swarm Site 1"
            SWARM1[Docker Swarm<br/>Rigspace Platform]
            TRAEFIK1[Traefik]
            RIGSPACE1[Rigspace Services<br/>Auth, Admin, Monitoring]
            STREAM1[Stream Service]
            DB1[MariaDB, MongoDB<br/>Redis, ClickHouse]
        end
        
        subgraph "Swarm Site 2"
            SWARM2[Docker Swarm<br/>Rigspace Platform]
            TRAEFIK2[Traefik]
            RIGSPACE2[Rigspace Services]
            STREAM2[Stream Service]
            DB2[MariaDB, MongoDB<br/>Redis, ClickHouse]
        end
    end
    
    subgraph "External Services"
        EXT_MINIO[External MinIO S3<br/>State/Backups/Logs]
        LETSENCRYPT[Let's Encrypt]
        DNS_ZONES[DNS Zones]
    end
    
    subgraph "Infrastructure as Code"
        TERRAFORM[Terraform/OpenTofu]
    end
    
    %% Central platform connections
    BIND9 --> DNS_ZONES
    CERT_MGR --> LETSENCRYPT
    METALLB --> INGRESS
    
    %% Identity flow
    LDAP --> VAULT
    VAULT --> ESO
    VAULT --> FORGEJO
    VAULT --> HARBOR
    VAULT --> GRAFANA
    VAULT --> ARGOCD
    VAULT --> BOUNDARY
    
    %% Monitoring connections to Swarm
    PROM --> THANOS
    THANOS --> GRAFANA
    LOKI --> GRAFANA
    LOKI --> EXT_MINIO
    
    %% Swarm to Central integration
    RIGSPACE1 -.->|Metrics| PROM
    RIGSPACE1 -.->|Logs| LOKI
    RIGSPACE2 -.->|Metrics| PROM
    RIGSPACE2 -.->|Logs| LOKI
    
    %% Swarm internal
    TRAEFIK1 --> RIGSPACE1
    TRAEFIK1 --> STREAM1
    RIGSPACE1 --> DB1
    STREAM1 --> DB1
    
    TRAEFIK2 --> RIGSPACE2
    TRAEFIK2 --> STREAM2
    RIGSPACE2 --> DB2
    STREAM2 --> DB2
    
    %% Backup and storage
    VELERO --> EXT_MINIO
    HARBOR --> EXT_MINIO
    PG --> EXT_MINIO
    
    %% IaC
    TERRAFORM --> EXT_MINIO
    TERRAFORM --> SWARM1
    TERRAFORM --> SWARM2
```

---

# Базовая инфраструктура

## DNS Infrastructure

### BIND9
- Внутренний DNS сервер
- RFC2136 динамические обновления
- TSIG ключи для безопасности
- CI\CD управление кастомными DNS записями

### External DNS
- Автоматическая синхронизация DNS записей
- Интеграция с Kubernetes Services и Ingress
- Поддержка FQDN template

---

# DNS Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant K8s as Kubernetes
    participant ExtDNS as External DNS
    participant BIND9 as BIND9 DNS
    participant Client as Client
    
    Dev->>K8s: Create LB Service/Ingress
    K8s->>ExtDNS: Resouce detected
    ExtDNS->>BIND9: RFC2136 DNS Update
    BIND9->>BIND9: Add A record
    ExtDNS->>K8s: DNS record created
    
    Client->>BIND9: DNS Query
    BIND9->>Client: IP Address
    Client->>K8s: HTTP Request
    K8s->>Client: Response
```

---

# Базовая инфраструктура

### DNS Records Self-Service Repository
- **Отдельный CI/CD репозиторий** для управления DNS записями и SSH хостами
- Единая структура данных для DNS, Boundary и AWX
- **A записи** для хостов с IP адресами
- **SRV записи** для service discovery (SSH, metrics, monitoring targets)
- **Группировка хостов** для Boundary host sets и AWX inventories
- **Remote state интеграция** с основным репозиторием для Boundary/AWX конфигурации
- GitOps workflow через Forgejo Actions
- Используется как единый слой service discovery для Prometheus/Grafana, Boundary и AWX

---

### DNS Records Self-Service Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as Forgejo<br/>dns-records repo
    participant CI as Forgejo Actions<br/>Terraform CI/CD
    participant BIND9 as BIND9 DNS
    participant Boundary as Boundary<br/>SSH Access
    participant AWX as AWX<br/>Automation
    participant RemoteState as Main Repo<br/>Remote State
    
    Note over Dev,Git: Self-Service DNS Management
    Dev->>Git: Create PR with hosts config
    Git->>CI: Trigger terraform plan
    CI->>RemoteState: Read Boundary/AWX config
    RemoteState->>CI: Return IDs and keys
    CI->>CI: Validate configuration
    CI->>Git: Show plan in PR comments
    
    Note over Dev,Git: Merge and Apply
    Dev->>Git: Merge PR to main
    Git->>CI: Trigger terraform apply
    CI->>BIND9: Create A records (RFC2136)
    CI->>BIND9: Create SRV records (service discovery)
    CI->>Boundary: Create hosts, host sets, targets
    CI->>AWX: Create hosts, groups, inventories
    CI->>Git: Commit state changes
```

---

# Базовая инфраструктура

## TLS Management

### Cert-Manager
- Автоматическое управление TLS сертификатами
- DNS-01 challenge (BIND9, CloudFlare)
- HTTP-01 challenge
- Let's Encrypt интеграция

### Internal CA
- Внутренний Certificate Authority
- Self-signed сертификаты для внутренних сервисов
- ClusterIssuer для автоматической выдачи

---

### TLS Certificate Flow

##### Public Certificates (Let's Encrypt)

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant K8s as Kubernetes
    participant CertMgr as Cert-Manager
    participant Ingress as Ingress Resource
    participant LE as Let's Encrypt
    participant CF as CloudFlare DNS
    participant Client as Client
    
    Note over Dev,Ingress: Certificate Request Flow
    Dev->>K8s: Create Ingress with tls
    K8s->>CertMgr: Certificate CRD detected
    CertMgr->>LE: ACME Challenge Request
    LE->>CertMgr: DNS-01 Challenge
    CertMgr->>CF: Create TXT record<br/>(_acme-challenge.domain.com)
    CF->>CF: DNS record created
    CF->>LE: DNS record verified
    LE->>CertMgr: Certificate issued
    CertMgr->>K8s: Store in TLS Secret
    K8s->>Ingress: Certificate ready
    
    Note over Client,K8s: HTTPS Connection
    Client->>Ingress: HTTPS Request
    Ingress->>Client: TLS Response<br/>(Valid Let's Encrypt cert)
```
---

### TLS Certificate Flow

##### Internal Certificates (Self-Signed CA)

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant K8s as Kubernetes
    participant CertMgr as Cert-Manager
    participant CA as Internal CA<br/>ClusterIssuer
    participant Secret as TLS Secret
    participant Ingress as Ingress Nginx
    participant Client as Client
    
    Note over Dev,Ingress: Internal Certificate Flow
    Dev->>K8s: Create Certificate tls-selfsign
    K8s->>CertMgr: Certificate request
    CertMgr->>CA: Sign certificate request
    CA->>CertMgr: Signed certificate<br/>(self-signed)
    CertMgr->>Secret: Store certificate<br/>(tls.crt, tls.key)
    Secret->>Ingress: Certificate available
    
    Note over Client,Ingress: HTTPS Connection
    Client->>Ingress: HTTPS Request<br/>(internal.domain.local)
    Ingress->>Client: TLS Response<br/>(Self-signed cert,<br/>requires CA trust)
```

---

# Базовая инфраструктура

## Load Balancing

### MetalLB
- LoadBalancer для bare-metal кластеров
- L2 режим балансировки
- Настраиваемый IP pool (172.15.172.210-225)

### Ingress Nginx
- HTTP/HTTPS маршрутизация
- SSL/TLS termination
- Интеграция с Cert-Manager для автоматических сертификатов

---

# Хранение данных

## PostgreSQL

### CloudNativePG Operator
- Современный PostgreSQL Operator для Kubernetes
- Управление кластерами через Cluster CRD
- Автоматическое создание и управление базами данных
- Managed Roles для автоматического управления пользователями через Kubernetes Secrets

### Архитектура кластера
- **Primary и Replicas** - поддержка высокой доступности с автоматическим failover
- **Типы сервисов**:
  - `{cluster}-rw` - read-write (primary)
  - `{cluster}-ro` - read-only (replicas)
  - `{cluster}-pooler` - connection pooler

---

# Хранение данных

## PostgreSQL

### Управление базами данных
- **Database CRD** - декларативное создание баз данных
- Автоматическое создание пользователей через managed roles
- Управление паролями через Kubernetes Secrets
- Отдельные базы для Grafana, Harbor, Boundary, AWX

### Connection Pooling
- **PgBouncer Pooler** - опциональный connection pooler
- Используется transaction pooling там, где возможно
- Настраиваемое количество реплик pooler
- Типы: rw (read-write), ro (read-only), r (read)

---

# Хранение данных

## PostgreSQL

### Резервное копирование
- **Barman** - интеграция с S3-совместимым хранилищем
- **ScheduledBackup** - автоматические бэкапы по расписанию (Cron)
- WAL архивирование с сжатием
- Retention policy для управления хранением
- Бэкапы с предпочтением standby инстансов

### Мониторинг и хранилище
- **PodMonitor** - интеграция с Prometheus Operator
- Метрики PostgreSQL для Prometheus/Grafana
- Persistent volumes для данных
- Настраиваемый StorageClass и масштабируемый размер

## Nexus3

- Artifact Repository Manager
- Maven, npm, PyPI repositories
- S3 backend для blob storage
- LDAP интеграция

---

# Хранение данных

## Harbor

- Enterprise-grade Docker и Helm registry
- Встроенная проверка безопасности контейнерных образов через **Trivy**
- Автоматическое сканирование артефактов и приоритезация уязвимостей (Critical / High / Medium)
- OIDC интеграция через Vault с маппингом openldap групп
- S3 backend для хранения образов
- Helm ChartMuseum

---

![Harbor Trivy Security Dashboard](./trivy.png)

- Централизованный дашборд уязвимостей по всем контейнерным образам
- Топ наиболее опасных артефактов и CVE для фокусной отработки
- Отдельная статистика по количеству уязвимостей и доле **fixable** проблем

---

# Идентификация и безопасность

## OpenLDAP

- Централизованная аутентификация
- CI\CD процесс управления пользователями и группами
- Deep интеграция с Vault - oidc клиенты получают группы и соответствующие права в других сервисах

---

## Direct LDAP Authentication

```mermaid
sequenceDiagram
    participant User as User
    participant App as Application<br/>(Forgejo/Nexus/AWX)
    participant LDAP as OpenLDAP Server
    
    User->>App: Login (username/password)
    App->>LDAP: BIND request with credentials
    LDAP->>LDAP: Verify credentials
    LDAP->>App: Authentication success
    LDAP->>App: Return user groups (devops/support)
    App->>App: Map groups to roles
    App->>User: Access granted with appropriate permissions
```

---

# Идентификация и безопасность

## Vault

- HashiCorp Vault для управления секретами
- KV v2 secrets engine
- LDAP authentication method
- OIDC provider для SSO
- SSH secret engine (ssh CA) работает в связке с Boundary
- Интеграция с OpenLDAP
- OIDC клиенты для: Harbor, Forgejo, Grafana, ArgoCD, Boundary
- Kubernetes auth method для External Secrets Operator

---

##### Vault OIDC Authentication Flow

```mermaid
sequenceDiagram
    participant User as User
    participant OIDCApp as OIDC App<br/>(Harbor/Grafana/ArgoCD/Boundary)
    participant Vault as HashiCorp Vault<br/>OIDC Provider
    participant LDAP as OpenLDAP Server
    
    Note over User,OIDCApp: Vault OIDC Authentication Flow
    User->>OIDCApp: Access request
    OIDCApp->>Vault: Redirect to OIDC login
    User->>Vault: Login with LDAP credentials
    Vault->>LDAP: Verify credentials
    LDAP->>Vault: User authenticated + groups
    Vault->>Vault: Apply policies based on groups
    Vault->>Vault: Generate OIDC token with groups
    Vault->>OIDCApp: Return OIDC token
    OIDCApp->>OIDCApp: Map groups to roles
    OIDCApp->>User: Access granted with appropriate permissions
```

---

# Authentication Flow

```mermaid
graph TB
    subgraph "Identity Provider"
        LDAP[OpenLDAP Server<br/>Users & Groups]
        DEVOPS[devops group<br/>Admin Access]
        SUPPORT[support group<br/>Read-Only Access]
    end
    
    subgraph "Secret Management"
        VAULT[HashiCorp Vault<br/>Secrets Engine]
        VAULT_AUTH[LDAP Auth Method]
        POLICIES[Vault Policies<br/>devops / support]
    end
    
    subgraph "Applications"
        FORGEJO[Forgejo<br/>Git Server<br/>OIDC/LDAP]
        HARBOR[Harbor<br/>Container/Helm registry<br/>OIDC]
        NEXUS[Nexus3<br/>Artifact Repository<br/>LDAP]
        GRAFANA[Grafana<br/>Monitoring<br/>OIDC]
        ARGOCD[ArgoCD<br/>GitOps<br/>OIDC]
        BOUNDARY[Boundary<br/>SSH/DB Access<br/>OIDC]
        ESO[External Secrets<br/>Operator<br/>K8s Auth]
        AWX[AWX<br/>Configuration Management<br/>LDAP]
    end
    
    LDAP --> DEVOPS
    LDAP --> SUPPORT
    
    VAULT --> VAULT_AUTH
    VAULT_AUTH --> LDAP
    VAULT_AUTH --> POLICIES
    
    FORGEJO --> LDAP
    FORGEJO --> VAULT
    HARBOR --> VAULT
    NEXUS --> LDAP
    GRAFANA --> VAULT
    ARGOCD --> VAULT
    BOUNDARY --> VAULT
    ESO --> VAULT
    AWX --> LDAP
```

---

# Идентификация и безопасность

## External Secrets Operator

- Автоматическая синхронизация секретов из Vault
- ClusterSecretStore для Vault
- Kubernetes auth method
- Periodic refresh секретов

---

# Идентификация и безопасность

## Boundary

- HashiCorp Boundary для безопасного доступа к инфраструктуре
- Контроль сессий подключения
- OIDC SSO через Vault
- Централизованная точка доступа на основе OpenLdap групп, которые привязаны к vault policies
- **SSH доступ** - безопасное прокси подключение к серверам без управления ключами
- **database доступ** - прокси для internal баз данных
- Controller и Worker архитектура
- PostgreSQL для хранения состояния
- Интеграция с OpenLDAP через Vault OIDC

---

# Идентификация и безопасность

## Boundary Use Cases

### SSH Access
- Безопасный доступ к серверам без управления SSH ключами
- Централизованное управление доступом
- Аудит всех SSH сессий
- Временные сессии с автоматическим истечением

### Database Connection
- Защищённые подключения к базам данных
- Динамические credentials через Vault
- Аудит всех database подключений

---

### Boundary Access Flow

```mermaid
sequenceDiagram
    participant User as user with boundary desktop or CLI
    participant Boundary as Boundary Controller<br/>OIDC Auth
    participant Vault as HashiCorp Vault<br/>OIDC Provider
    participant Worker as Boundary Worker
    participant Target as Target System<br/>(SSH/DB)
    
    User->>Boundary: Access request
    Boundary->>Vault: OIDC authentication
    Vault->>Vault: Verify LDAP credentials
    Vault->>Boundary: OIDC token with groups
    Boundary->>Boundary: Check permissions
    Boundary->>Worker: Create session
    Worker->>Target: Establish connection
    Target->>Worker: Connection established
    Worker->>User: Proxy connection
    User->>Target: Access via Boundary proxy
```

---

# Идентификация и безопасность

## Kyverno

- Kubernetes-native policy engine
- Policy validation и enforcement
- Resource mutation
- Background scanning
- PolicyReports для анализа

### Текущее состояние

- **Режим работы:** Audit Mode (логирование нарушений без блокировки)
- **Всего политик:** 12 активных политик безопасности
- **Background scanning:** включен
- Автоматическая проверка всех ресурсов на соответствие политикам безопасности

---

# Rigspace Platform (Docker Swarm)

## Обзор

**Rigspace** — комплексная микросервисная платформа для нефтегазовой отрасли

- Обработка данных скважин в реальном времени
- Мониторинг и аналитика оборудования
- Генерация отчётов и документов
- Развёрнута на **Docker Swarm** кластерах
- Управляется через **Terraform**

---

# Rigspace Platform

## Архитектура платформы

**Слоистая архитектура:**

1. **Ingress** — Traefik (reverse proxy, TLS termination)
2. **Config** — Spring Cloud Config Server (централизованная конфигурация)
3. **Core Services** — бизнес-логика (Auth, Admin, Monitoring, Analytics, Reporting, Drive)
4. **Stream** — обработка потоковых данных со скважин
5. **Databases** — MariaDB, MongoDB, Redis, ClickHouse, Elasticsearch
6. **Message Queues** — NATS, RabbitMQ
7. **Monitoring** — Prometheus, Grafana, Loki, Tempo

---

# Интеграция Kubernetes ↔ Swarm

## Взаимодействие платформ

### Централизованные сервисы для Swarm-кластеров

**Kubernetes предоставляет:**

- **Мониторинг** — Prometheus и Loki собирают метрики и логи из Swarm
- **Логирование** — централизованное хранение в S3 через Loki
- **CI/CD** — Forgejo и OpenTofu для управления конфигурацией Swarm
- **Безопасность** — Vault для управления секретами, Boundary для доступа
- **DNS** — BIND9 для единого DNS-пространства

---

# Интеграция Kubernetes ↔ Swarm

## Потоки данных

```mermaid
graph TB
    subgraph "Docker Swarm Cluster"
        SWARM_SERVICES[Rigspace Services]
        SWARM_LOGS[Application Logs]
        SWARM_METRICS[Prometheus Metrics]
    end
    
    subgraph "Central Kubernetes Platform"
        LOKI[Loki<br/>Log Aggregation]
        PROM[Prometheus<br/>Metrics Storage]
        THANOS[Thanos<br/>Long-term Storage]
        GRAFANA[Grafana<br/>Visualization]
        VAULT[Vault<br/>Secrets]
        FORGEJO[Forgejo<br/>Git/CI]
    end
    
    subgraph "External Storage"
        S3[MinIO S3<br/>Backups/Logs]
    end
    
    SWARM_LOGS -->|Log Collection| LOKI
    SWARM_METRICS -->|Metrics Export| PROM
    PROM --> THANOS
    LOKI --> GRAFANA
    THANOS --> GRAFANA
    LOKI --> S3
    THANOS --> S3
    
    SWARM_SERVICES -->|Secrets Sync| VAULT
    SWARM_SERVICES -->|Config Management| FORGEJO
```

---

# Интеграция Kubernetes ↔ Swarm

## Преимущества интеграции

### Единая точка управления

- **Наблюдаемость** — все метрики и логи в одном месте (Grafana)
- **Автоматизация** — Infrastructure as Code через Terraform

### Изоляция и автономность

- **Независимость площадок** — каждый Swarm-кластер работает автономно
- **Отказоустойчивость** — падение одной площадки не влияет на другие
- **Масштабируемость** — легко добавлять новые площадки

---

# CI/CD платформа

## Forgejo

- Self-hosted Git сервис (Gitea fork)
- Git repositories
- Pull Requests, Issues
- OIDC/LDAP интеграция
- SSH доступ через LoadBalancer

## Forgejo Runner

- CI/CD runners для Forgejo
- Docker-in-Docker
- Act runner для GitHub Actions-совместимых workflows

---

# CI/CD платформа

## DNS Records Self-Service Repository

- **Отдельный Git репозиторий** для управления DNS записями и SSH хостами
- **GitOps workflow** через Forgejo Actions
- **Единая структура данных** - один источник истины для DNS, Boundary и AWX
- **A записи** - автоматическое создание DNS записей для хостов
- **SRV записи** - service discovery для SSH, metrics и других сервисов
- **Группировка хостов** - автоматическое создание Boundary host sets и AWX inventories по группам
- **Remote state интеграция** - получение Boundary/AWX конфигурации из основного репозитория
- **Terraform провайдеры** - hashicorp/dns, hashicorp/boundary, denouche/awx

---

# CI/CD платформа

## ArgoCD

- GitOps continuous delivery
- Declarative GitOps workflow
- OIDC SSO через Vault
- Forgejo/Gitea интеграция
- AppProjects для организации
- Web UI + CLI

---

# CI/CD платформа

## Renovate

- Автоматизация обновления зависимостей
- Автообновление Docker images, Helm charts, Java, Node
- Интеграция с Forgejo
- Dependency Dashboard

---

# Мониторинг и логирование

## Единая платформа наблюдаемости

### Централизованный сбор данных

**Prometheus + Thanos Stack:**
- **Prometheus** — сбор и хранение метрик из Kubernetes и Swarm-кластеров
- **Thanos** — долгосрочное хранение метрик, глобальный запрос
- **Alertmanager** — правила алертинга и уведомления
- **Grafana** — визуализация с OIDC интеграцией

**Loki Stack:**
- **Loki** — индексирование и хранение логов
- **Promtail** — сбор логов из Kubernetes (DaemonSet)
- **Alloy/Prometheus** — сбор логов и метрик из Swarm-кластеров
- **Gateway** — load balancing


---

# Мониторинг и логирование

## Поток данных мониторинга

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        K8S_LOGS[K8s Application Logs]
        K8S_METRICS[K8s System Metrics]
        PROMTAIL[Promtail<br/>Log Collection]
        PROM_K8S[Prometheus<br/>Metric Collection]
    end
    
    subgraph "Docker Swarm Clusters"
        SWARM_LOGS[Swarm Application Logs<br/>Rigspace Services]
        SWARM_METRICS[Swarm Metrics<br/>Prometheus Exporters]
        ALLOY[Alloy/Prometheus<br/>Collection Agent]
    end
    
    subgraph "Central Storage"
        PROM[Prometheus<br/>Time Series DB]
        THANOS[Thanos<br/>Long-term Storage]
        LOKI[Loki<br/>Log Storage]
        EXT_MINIO[External MinIO<br/>S3 Backend]
    end
    
    subgraph "Visualization"
        GRAFANA[Grafana<br/>Unified Dashboards]
        ALERTMANAGER[Alertmanager<br/>Alerting]
    end
    
    K8S_LOGS --> PROMTAIL
    K8S_METRICS --> PROM_K8S
    SWARM_LOGS --> ALLOY
    SWARM_METRICS --> ALLOY
    
    PROMTAIL --> LOKI
    PROM_K8S --> PROM
    ALLOY --> LOKI
    ALLOY --> PROM
    
    PROM --> THANOS
    THANOS --> EXT_MINIO
    LOKI --> EXT_MINIO
    THANOS --> GRAFANA
    LOKI --> GRAFANA
    PROM --> ALERTMANAGER
```

---

![Infrastructure metrics hosts](./metrics.png)

- Prometheus использует SRV-записи для автоматического формирования scrape targets (node-exporter, blackbox и др.)
- В Grafana реализован удобный выбор хоста по переменной, что упрощает анализ метрик по любому серверу

---

# Backup и восстановление

## Velero

- Автоматизация backup и restore для Kubernetes
- Scheduled backups (daily/weekly)
- S3-совместимое хранилище (внешний MinIO)
- Restic для volume backups
- Настраиваемая retention policy
- Выборочный backup по namespaces

### Backup стратегия:
- Daily backup в 2:00 AM
- Weekly backup в 3:00 AM (воскресенье)
- Retention: 30 дней (daily), 60 дней (weekly)
- Namespaces: vault, harbor, forgejo, nexus3, openldap, postgresql, awx, dns-system

---

# Disaster Recovery

```mermaid
graph TB
    subgraph "Primary Cluster"
        K8S1[Kubernetes Cluster 1]
        STATE1[Terraform State 1]
        BACKUP1[Velero Backup 1]
    end
    
    subgraph "Secondary Cluster"
        K8S2[Kubernetes Cluster 2]
        STATE2[Terraform State 2]
        BACKUP2[Velero Backup 2]
    end
    
    subgraph "External Storage"
        EXT_MINIO[External MinIO<br/>S3 Backend]
        DNS[DNS Records]
    end
    
    K8S1 --> STATE1
    K8S2 --> STATE2
    STATE1 --> EXT_MINIO
    STATE2 --> EXT_MINIO
    EXT_MINIO --> DNS
    
    K8S1 --> BACKUP1
    K8S2 --> BACKUP2
    BACKUP1 --> EXT_MINIO
    BACKUP2 --> EXT_MINIO
```

---

# Зависимости и интеграции

## Внешние сервисы

### External MinIO S3
- Используется для:
  - Terraform/OpenTofu state backend
  - Velero backups storage
  - Loki chunks и ruler storage
  - Postgresql backups storage
  - Harbor image store
  - Nexus blob store

### CloudFlare (опционально)
- DNS-01 challenge для Let's Encrypt
- Публичные сертификаты

---

# Security Model

```mermaid
graph TB
    subgraph "Certificate Management"
        LETSENCRYPT[Let's Encrypt<br/>Public CA]
        INTERNAL_CA[Internal CA<br/>Self-signed]
        CERT_MGR[Cert-Manager<br/>Controller]
        ISSUER_LE[ClusterIssuer<br/>letsencrypt-prod]
        ISSUER_CA[ClusterIssuer<br/>internal-ca]
        SECRETS[TLS Secrets<br/>auto-generated]
    end
    
    subgraph "Secret Management"
        VAULT[HashiCorp Vault<br/>KV v2 Secrets]
        ESO[External Secrets<br/>Operator]
        K8S_SECRETS[Kubernetes Secrets<br/>synced from Vault]
    end
    
    subgraph "Identity & Authentication"
        LDAP[OpenLDAP<br/>Users & Groups]
        OIDC[Vault OIDC<br/>SSO Provider]
        BOUNDARY[Boundary<br/>Zero-Trust Access]
    end
    
    subgraph "Applications"
        INGRESS[Ingress Nginx<br/>TLS Termination]
        APPS[Applications<br/>HTTPS + OIDC]
    end
    
    subgraph "DNS Security"
        TSIG[TSIG Keys<br/>RFC2136 Auth]
        BIND9[BIND9 DNS<br/>Secure Updates]
    end
    
    subgraph "Policy Engine"
        KYVERNO[Kyverno<br/>Validation & Mutation]
        POLICIES[ClusterPolicies<br/>Security Rules]
        POD_SECURITY[Pod Security Standards<br/>Baseline/Restricted]
        BEST_PRACTICES[Best Practices<br/>Resource Limits, Tags]
        EXCLUSIONS[Namespace Exclusions<br/>System Components]
    end
    
    %% Certificate flow
    LETSENCRYPT --> CERT_MGR
    INTERNAL_CA --> CERT_MGR
    CERT_MGR --> ISSUER_LE
    CERT_MGR --> ISSUER_CA
    ISSUER_LE --> SECRETS
    ISSUER_CA --> SECRETS
    SECRETS --> INGRESS
    INGRESS --> APPS
    
    %% Secret management
    VAULT --> ESO
    ESO --> K8S_SECRETS
    K8S_SECRETS --> APPS
    
    %% Identity
    LDAP --> VAULT
    VAULT --> OIDC
    OIDC --> APPS
    BOUNDARY --> OIDC
    
    %% DNS Security
    TSIG --> BIND9
    BIND9 --> APPS
    
    %% Policy
    KYVERNO --> POLICIES
    POLICIES --> POD_SECURITY
    POLICIES --> BEST_PRACTICES
    POLICIES --> EXCLUSIONS
    POD_SECURITY --> APPS
    BEST_PRACTICES --> APPS
    EXCLUSIONS --> APPS
```

---

# Эксплуатация и масштабирование

## Управление платформой

### Infrastructure as Code

- **Terraform/OpenTofu** — единая точка управления всей инфраструктурой
- **GitOps** — Forgejo для автоматического развертывания
- **Version Control** — все конфигурации в Git
- **State Management** — централизованное хранение state в S3

---

# Эксплуатация и масштабирование

### Масштабирование

**Kubernetes-платформа:**
- Горизонтальное масштабирование через увеличение реплик
- Автоматическое масштабирование на основе метрик (опционально)

**Swarm-площадки:**
- Добавление новых площадок через Terraform
- Независимое масштабирование каждой площадки
- Репликация сервисов внутри Swarm-кластера

---

# Заключение

## Ключевые выводы

### Центральная Kubernetes-платформа
✅ **Полная автоматизация** — DNS, TLS, развертывание  
✅ **Infrastructure as Code** — Terraform/OpenTofu  
✅ **GitOps** — Forgejo для декларативного управления  
✅ **Observability** — единая платформа для метрик (Prometheus + Thanos) и логов (Loki)  
✅ **Security** — policy engine (Kyverno) + secret management (ESO + Vault)  
✅ **Backup** — Velero для disaster recovery  

### Интеграция с бизнес-приложениями
✅ **Масштабируемость** — лёгкое добавление новых Swarm-площадок  
✅ **Централизованный мониторинг** — все метрики и логи в одном месте  
✅ **Единая безопасность** — централизованная аутентификация для всех платформ  
✅ **Автономность** — независимая работа площадок с интеграцией в центр  

---

# Заключение

## Ключевые выводы

### Преимущества для бизнеса
- **Масштабируемость** — легко добавлять новые площадки и сервисы  
- **Надёжность** — изоляция площадок, централизованный backup  
- **Единые стандарты** — централизованные политики безопасности  
- **Наблюдаемость** — общая картина всех систем в одном месте  

### Преимущества для технических команд
- **Автоматизация** — IaC, GitOps, Zero-touch DNS/TLS  
- **Безопасность** — централизованная аутентификация, управление секретами  
- **Мониторинг** — единая платформа для метрик и логов всех систем  
- **Упрощённое управление** — декларативная конфигурация через Terraform  

---

# Заключение

## Архитектурные преимущества

### Двухуровневая модель
- **Kubernetes** — центральная платформа для инфраструктурных сервисов
- **Docker Swarm** — бизнес-приложения на распределённых площадках
- **Интеграция** — единая точка мониторинга, безопасности и управления

### Гибкость и отказоустойчивость
- Независимая работа площадок
- Централизованное управление без жёсткой привязки
- Масштабирование по требованию бизнеса

---

# Production-Ready Infrastructure Platform

**Единая платформа для масштабируемых бизнес-решений** 🚀

**Kubernetes + Docker Swarm = Гибкость + Надёжность + Масштабируемость**

---
layout: center
class: text-center
---

# Спасибо за внимание!

**Вопросы?**
