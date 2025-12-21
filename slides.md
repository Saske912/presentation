---
theme: ./themes/custom
layout: cover
background: '#1e1e1e'
class: text-center
highlighter: shiki
lineNumbers: false
info: |
  ## Kubernetes Infrastructure Stack
  Production-Ready Infrastructure as Code
drawings:
  persist: false
transition: slide-left
title: Kubernetes Infrastructure Stack
mdc: true
contextMenu: false
---

# Kubernetes Infrastructure Stack

## Production-Ready Infrastructure as Code

**Полнофункциональный Kubernetes кластер**  
**с автоматизацией DNS, TLS, CI/CD и мониторингом**

---

# Содержание

1. Введение и обзор
2. Общая архитектура
3. Базовая инфраструктура
4. Хранение данных
5. Идентификация и безопасность
6. CI/CD платформа
7. Мониторинг и логирование
8. Backup и восстановление
9. Зависимости и интеграции
10. Заключение

---

# Введение

## Цели проекта

- **Infrastructure as Code** - полная автоматизация через Terraform/OpenTofu
- **Zero-touch DNS** - автоматическое создание DNS записей
- **Auto TLS** - автоматическая выдача и обновление сертификатов
- **GitOps** - декларативное управление приложениями
- **Observability** - полный мониторинг и логирование
- **Security** - централизованная аутентификация и управление секретами

---

# Общая архитектура системы

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Control Plane"
            CP[Control Plane<br/>Talos Linux]
        end
        
        subgraph "Worker Nodes"
            WN1[Worker Node 1<br/>Talos Linux]
            WN2[Worker Node 2<br/>Talos Linux]
        end
        
        subgraph "Infrastructure Services"
            BIND9[BIND9 DNS<br/>RFC2136]
            EXT_DNS[External DNS<br/>Auto Records]
            CERT_MGR[Cert-Manager<br/>Let's Encrypt]
            METALLB[MetalLB<br/>Load Balancer]
            INGRESS[Ingress Nginx<br/>Router]
            CA[Internal CA<br/>Self-signed]
        end
        
        subgraph "Identity & Security"
            LDAP[OpenLDAP<br/>Users/Groups]
            VAULT[Vault<br/>Secrets & OIDC]
            ESO[External Secrets<br/>Operator]
            KYVERNO[Kyverno<br/>Policies]
            BOUNDARY[Boundary<br/>SSH/DB Access]
        end
        
        subgraph "Storage & Databases"
            PG[PostgreSQL<br/>Operator]
            HARBOR[Harbor<br/>Registry]
            NEXUS[Nexus3<br/>Artifacts]
        end
        
        subgraph "CI/CD & GitOps"
            FORGEJO[Forgejo<br/>Git]
            ARGOCD[ArgoCD<br/>GitOps]
            RENOVATE[Renovate<br/>Updates]
        end
        
        subgraph "Monitoring"
            VM[VictoriaMetrics<br/>Metrics]
            LOKI[Loki<br/>Logs]
            GRAFANA[Grafana<br/>Dashboards]
        end
        
        subgraph "Backup"
            VELERO[Velero<br/>Backups]
        end
    end
    
    subgraph "External Services"
        EXT_MINIO[External MinIO S3<br/>State/Backups/Logs]
        LETSENCRYPT[Let's Encrypt<br/>Public Certs]
        INTERNAL_DNS_ZONE[Internal DNS Zone<br/>observ.local]
        REAL_DNS_ZONE[Real DNS Zone<br/>support-tetra-soft.ru]
    end
    
    subgraph "Infrastructure as Code"
        TERRAFORM[Terraform/OpenTofu]
        HELM[Helm Charts]
    end
    
    %% Infrastructure connections
    EXT_DNS --> BIND9
    BIND9 --> INTERNAL_DNS_ZONE
    BIND9 --> REAL_DNS_ZONE
    CERT_MGR --> LETSENCRYPT
    CERT_MGR --> CA
    METALLB --> INGRESS
    
    %% Identity & Auth
    LDAP --> VAULT
    VAULT --> ESO
    VAULT --> FORGEJO
    VAULT --> HARBOR
    VAULT --> GRAFANA
    VAULT --> ARGOCD
    VAULT --> BOUNDARY
    
    %% Storage
    PG --> GRAFANA
    PG --> HARBOR
    PG --> BOUNDARY
    
    %% Monitoring
    VM --> GRAFANA
    LOKI --> GRAFANA
    LOKI --> EXT_MINIO
    
    %% Backup
    VELERO --> EXT_MINIO
    
    %% IaC
    TERRAFORM --> EXT_MINIO
    TERRAFORM --> HELM
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
- Метрики PostgreSQL для VictoriaMetrics/Grafana
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
- Trivy для сканирования образов
- OIDC интеграция через Vault с маппингом openldap групп
- S3 backend для хранения образов
- Helm ChartMuseum

---

## Внешний MinIO S3O

- **Внешний сервис** (не часть кластера)
- Используется для:
  - Terraform state backend
  - Velero backups
  - Loki log storage
  - Postgresql Backups
  - Harbor registry
  - Nexus3 repository

---

# Идентификация и безопасность

## OpenLDAP

- Централизованная аутентификация
- CI\CD процесс управления пользователями и группами
- Deep интеграция с Vault - oidc клиенты получают группы и соответствующие права в других сервисах

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
-  ✅ Pass:  844 проверок
-  ❌ Fail:  151 нарушений

---

# Идентификация и безопасность

## Kyverno: Pod Security Standards

Политики безопасности на основе Pod Security Standards (все включены в Audit mode):

- ✅ **Disallow Privileged Containers** - запрет privileged mode
- ✅ **Disallow Host Namespaces** - запрет hostNetwork, hostPID, hostIPC
- ✅ **Require Non-Root User** - требование runAsNonRoot: true
- ✅ **Disallow hostPath Volumes** - запрет hostPath volumes
- ✅ **Disallow Dangerous Capabilities** - запрет SYS_ADMIN, NET_ADMIN и др.
- ✅ **Disallow hostPort** - запрет использования hostPort
- ✅ **Disallow Privilege Escalation** - требование allowPrivilegeEscalation: false

---

# Идентификация и безопасность

## Kyverno: Best Practices

Политики best practices для улучшения качества развертываний:

- ✅ **Require Resource Limits** - обязательные CPU и memory limits (Audit mode)
- ✅ **Disallow Latest Tag** - запрет использования `:latest` тега (Audit mode)
- ✅ **Require ImagePullPolicy** - enforce IfNotPresent или Never (Audit mode)
- ✅ **Disallow Default Namespace** - запрет создания ресурсов в default namespace (Audit mode)
- ⚪ **Require Labels** - обязательные labels (выключено, опционально)
- ⚪ **Require Probes** - liveness и readiness probes (выключено, опционально)

---

# Идентификация и безопасность

## Kyverno: Исключения Namespace

Системные компоненты, требующие привилегий, исключаются из политик:

- `kube-system`, `kube-public`, `kube-node-lease` - системные namespace Kubernetes
- `kyverno` - сам Kyverno
- `metallb-system` - MetalLB требует hostNetwork, hostPort
- `ingress-nginx` - Ingress контроллеры могут требовать привилегий
- `forgejo-runner` - Docker-in-Docker требует privileged mode
- `local-path-storage` - Storage provisioner может требовать hostPath

**Двухуровневая защита:**
1. **Webhook level** - полное исключение из обработки на уровне admission webhook
2. **Policy level** - каждая политика дополнительно проверяет исключения

**Всего исключено:** 8 namespace

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

### Kyverno Policy Enforcement Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant K8s as Kubernetes API
    participant Kyverno as Kyverno Webhook
    participant Policy as ClusterPolicy
    participant App as Application Pod
    
    Dev->>K8s: Create/Update Resource
    K8s->>Kyverno: Admission Request
    Kyverno->>Kyverno: Check namespace exclusion
    
    alt Namespace excluded
        Kyverno->>K8s: Allow (bypass policies)
    else Namespace not excluded
        Kyverno->>Policy: Validate against policies
        Policy->>Policy: Check security rules
        
        alt Policy violation
            alt Audit Mode
                Policy->>Kyverno: Log violation
                Kyverno->>K8s: Allow (with warning)
            else Enforce Mode
                Policy->>Kyverno: Reject request
                Kyverno->>K8s: Deny (block creation)
                Kyverno->>Dev: Error message
            end
        else Policy compliant
            Policy->>Kyverno: Validation passed
            Kyverno->>K8s: Allow
            K8s->>App: Resource created
        end
    end
```

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

## VictoriaMetrics Stack

### Компоненты:
- **VMSingle** - хранение метрик (50Gi по умолчанию)
- **VMAgent** - сбор метрик из кластера
- **VMAlert** - alerting rules
- **Grafana** - визуализация с OIDC интеграцией

### Возможности:
- Предустановленные Kubernetes dashboards
- Node Exporter и kube-state-metrics
- ServiceMonitor для автоматического discovery
- Интеграция с Loki для log correlation

---

# Мониторинг и логирование

## Loki Stack

### Компоненты:
- **Loki** - индексирование и хранение логов
- **Promtail** - DaemonSet для автоматического сбора логов
- **Gateway** - load balancing

### Возможности:
- S3 backend (внешний MinIO) для хранения
- Retention: 30 дней (настраивается)
- Интеграция с Grafana (автоматический datasource)
- LogQL для мощных запросов
- Log correlation с метриками

---

# Monitoring Flow

```mermaid
graph TB
    subgraph "Data Collection"
        LOGS[Application Logs]
        METRICS[System Metrics]
        EVENTS[Kubernetes Events]
    end
    
    subgraph "Processing"
        PROMTAIL[Promtail<br/>Log Collection]
        VMAGENT[VMAgent<br/>Metric Collection]
        ALERT[VMAlert<br/>Alerting]
    end
    
    subgraph "Storage"
        VMSINGLE[VMSingle<br/>Time Series DB]
        LOKI[Loki<br/>Log Storage]
        EXT_MINIO[External MinIO<br/>S3 Backend]
    end
    
    subgraph "Visualization"
        GRAFANA[Grafana<br/>Dashboards]
        ALERTS[Alert Manager]
    end
    
    LOGS --> PROMTAIL
    METRICS --> VMAGENT
    EVENTS --> ALERT
    
    PROMTAIL --> LOKI
    VMAGENT --> VMSINGLE
    ALERT --> ALERTS
    
    LOKI --> EXT_MINIO
    VMSINGLE --> GRAFANA
    LOKI --> GRAFANA
```

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

## Граф зависимостей (часть 1)

```
Базовая инфраструктура
  ↓
├─→ OpenLDAP
│     ↓
│   Vault (LDAP auth + OIDC)
│     ↓
│   ├─→ Forgejo (OIDC/LDAP)
│   │     ↓
│   │   Forgejo Runner
│   │     ↓
│   │   Renovate
│   │
│   ├─→ Harbor (OIDC)
│   ├─→ Grafana (OIDC)
│   ├─→ ArgoCD (OIDC)
│   ├─→ Boundary (OIDC)
│   └─→ External Secrets Operator (K8s Auth)
```

---

# Зависимости и интеграции

## Граф зависимостей (часть 2)

```
├─→ BIND9 → External DNS
├─→ MetalLB → Ingress Nginx
│
├─→ PostgreSQL
│     ↓
│   ├─→ Grafana
│   ├─→ Harbor
│   └─→ Boundary
│   └─→ AWX
│
├─→ VictoriaMetrics Stack
│     ↓
│   Loki (интеграция в Grafana)
│
└─→ Kyverno (независимый)
├─→ Cert-Manager (независимый)
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

# Infrastructure as Code Flow

```mermaid
graph TB
    subgraph "Development"
        CODE[Terraform Code]
        TFVARS[terraform.tfvars]
    end
    
    subgraph "State Management"
        EXT_MINIO[External MinIO<br/>S3 Backend]
        STATE[Terraform State]
    end
    
    subgraph "Deployment"
        TOFU[OpenTofu Apply]
        K8S[Kubernetes API]
    end
    
    subgraph "Services"
        HELM[Helm Charts]
        APPS[Applications]
    end
    
    CODE --> TOFU
    TFVARS --> TOFU
    TOFU --> EXT_MINIO
    EXT_MINIO --> STATE
    TOFU --> K8S
    K8S --> HELM
    HELM --> APPS
```

---

# Заключение

## Ключевые достижения

✅ **Полная автоматизация** - DNS, TLS, развертывание  
✅ **Infrastructure as Code** - Terraform/OpenTofu  
✅ **GitOps** - ArgoCD для декларативного управления  
✅ **Observability** - Метрики (VictoriaMetrics) + Логи (Loki)  
✅ **Security** - Policy engine (Kyverno) + Secret management (ESO + Vault)  
✅ **Backup** - Velero для disaster recovery  
✅ **Automation** - Renovate для обновлений  

---

# Заключение

## Преимущества

### 🚀 Автоматизация
- Zero-touch DNS
- Auto TLS
- Infrastructure as Code

### 🔒 Безопасность
- Централизованная аутентификация (LDAP + Vault)
- Policy enforcement (Kyverno)
- Secret management (ESO + Vault)

---

# Заключение

## Преимущества

### 📈 Масштабируемость
- Load Balancing
- Централизованное управление
- GitOps для быстрого развертывания

### 🛠️ Удобство разработки
- Автоматические DNS имена
- Простая маршрутизация
- Декларативное управление

---

# Production-Ready Infrastructure Stack

**Готово к продакшену!** 🚀

---
layout: center
class: text-center
---

# Спасибо за внимание!

**Вопросы?**
