## Настройка Prometheus и Grafana для atom-dbro-backend на удалённом сервере

### 1. Требования на удалённом сервере

- **Node.js**: версия, совместимая с NestJS 10 (рекомендуется Node 18 LTS).
- **Переменные окружения** (`.env`):
  - стандартные для приложения (БД, Redis и т.п.),
  - порт (например, `PORT=3000`).
- **Сборка и запуск**:
  - установка зависимостей: `npm ci` (или `npm install`);
  - сборка: `npm run build`;
  - запуск: `npm run start:prod` (или через PM2/systemd).

После запуска:

- бизнес-API доступно по `http://<host>:<port>/api/...`;
- метрики Prometheus доступны по `http://<host>:<port>/metrics`.

### 2. Сетевой доступ к `/metrics`

- **Открыть порт** (например, 3000) на сервере:
  - в firewall/iptables/security group открыть порт только:
    - либо для Prometheus (его IP/подсеть),
    - либо для балансировщика/ingress, за которым сидит Prometheus.
- **Рекомендация**:
  - не делать `/metrics` публичным в интернет;
  - ограничить доступ по IP/подсети на уровне:
    - firewall сервера;
    - или L7-прокси (Nginx/Ingress Controller), если используется.

Если используется reverse-proxy (Nginx/Ingress):

- прокинуть маршрут `/metrics` напрямую до backend’а;
- при необходимости повесить на него отдельные правила доступа.

### 3. Настройка облачного Prometheus

Предполагается, что Prometheus уже развёрнут в облаке и конфигурируется через `prometheus.yml` (или аналогичный механизм).

**Пример job для backend’а:**

```yaml
scrape_configs:
  - job_name: 'atom-dbro-backend'
    scrape_interval: 15s        # или нужное вам значение
    metrics_path: /metrics
    static_configs:
      - targets:
          - 'your-backend-host:3000'  # реальный host:port удалённого сервера
```

- Если доступ идёт через HTTPS и доменное имя:

  ```yaml
  scrape_configs:
    - job_name: 'atom-dbro-backend'
      scrape_interval: 15s
      scheme: https
      metrics_path: /metrics
      static_configs:
        - targets:
            - 'your-domain.com:443'
  ```

- Если `/metrics` защищён (например, Basic Auth или токеном) через прокси:
  - использовать `authorization` или `basic_auth` в конфиге Prometheus, согласно документации облачного провайдера.

**Проверка:**

- в веб-интерфейсе Prometheus открыть раздел **Targets**;
- убедиться, что target `atom-dbro-backend` в состоянии `UP`.

### 4. Настройка облачной Grafana

Предполагается, что Grafana уже развёрнута в облаке.

#### 4.1. Добавление источника данных Prometheus

- В интерфейсе Grafana:
  - перейти в `Configuration → Data sources → Add data source`;
  - выбрать тип **Prometheus**.
- Указать:
  - **URL**: адрес облачного Prometheus (`http://<prometheus-host>:9090` или URL, который даёт облачный провайдер);
  - при необходимости настроить авторизацию (Token/Basic Auth).
- Нажать **Save & Test** — статус должен быть “Data source is working”.

#### 4.2. Создание базового дашборда

- Перейти в `Dashboards → New → New dashboard → Add new panel`.
- Выбрать источник данных Prometheus.
- Использовать примерные запросы:

- **Latency HTTP-запросов (p90) по роутам:**

```promql
histogram_quantile(0.9, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
```

- **RPS по методам и кодам:**

```promql
sum(rate(http_request_duration_seconds_count[5m])) by (method, status)
```

- **Error rate (5xx):**

```promql
sum(rate(http_request_duration_seconds_count{status=~"5.."}[5m])) by (route)
```

- **Память процесса:**

```promql
process_resident_memory_bytes
```

- Настроить тип визуализации (обычно **Time series**), оси, легенду и сохранить дашборд.

### 5. Ручное тестирование на удалённом сервере

1. **Проверка приложения на сервере:**

   ```bash
   curl http://localhost:3000/metrics
   ```

   Убедиться, что:

   - ответ `200 OK`;
   - содержимое в формате `text/plain` с метриками Prometheus (строки `# HELP`, `# TYPE` и т.д.).

2. **Проверка доступности снаружи (откуда будет ходить Prometheus):**

   ```bash
   curl http://your-backend-host:3000/metrics
   ```

   Убедиться, что соединение устанавливается и выдаёт метрики.

3. **Проверка в Prometheus:**

   - Открыть UI Prometheus → вкладка **Graph**.
   - Выполнить запрос:

     ```promql
     http_request_duration_seconds_count
     ```

   - Убедиться, что есть ненулевые значения.

4. **Проверка в Grafana:**

   - Открыть созданный дашборд.
   - Сделать несколько запросов к API (`/api/...`) через Postman/браузер.
   - Убедиться, что графики (RPS, latency, error rate) реагируют после следующего scrape-интервала.

### 6. Краткое резюме

- На сервере: запустить приложение и убедиться, что `/metrics` отдаёт метрики и порт/маршрут доступны Prometheus.
- В Prometheus (облако): добавить job с `metrics_path: /metrics` и target `your-backend-host:port`, проверить, что target `UP`.
- В Grafana (облако): подключить Prometheus как источник данных и создать дашборд с запросами к `http_request_duration_seconds_*` и стандартным метрикам процесса.


