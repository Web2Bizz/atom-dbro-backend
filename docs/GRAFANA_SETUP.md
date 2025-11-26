## Настройка Grafana для мониторинга atom-dbro-backend

Этот документ описывает, как настроить Grafana (развёрнутую в облаке) для визуализации метрик, которые отдаёт backend по эндпоинту `/metrics`.

### 1. Предпосылки

- Backend `atom-dbro-backend` уже развёрнут и доступен по `http://<host>:<port>`.
- Метрики Prometheus доступны по `http://<host>:<port>/metrics`.
- Облачный Prometheus уже собрал метрики с backend’а (target в состоянии `UP`).
- У вас есть доступ в веб-интерфейс Grafana (логин/пароль или SSO).

### 2. Подключение источника данных Prometheus в Grafana

1. Авторизуйтесь в Grafana.
2. В левом меню перейдите в:
   - **Configuration → Data sources**.
3. Нажмите кнопку **Add data source**.
4. В списке типов источников данных выберите **Prometheus**.
5. В настройках источника данных укажите:
   - **Name**: например, `Prometheus-main` (или любое осмысленное имя).
   - **URL**: адрес вашего экземпляра Prometheus, например:
     - `http://prometheus:9090`
     - или URL, который предоставляет облачный провайдер (например, Managed Prometheus).
   - **Access**: обычно `Server` (по умолчанию).
   - **Auth / Headers**:
     - если провайдер требует токен или Basic Auth — заполнить соответствующие поля в соответствии с документацией провайдера.
6. Нажмите **Save & Test**:
   - статус должен быть `Data source is working`.

### 3. Создание базового дашборда

#### 3.1. Создать новый дашборд

1. В левом меню Grafana перейдите в:
   - **Dashboards → New → New dashboard**.
2. Нажмите **Add new panel**.

#### 3.2. Панель с latency HTTP-запросов (p90 по роутам)

1. Внизу панели выберите ваш источник данных (например, `Prometheus-main`).
2. В поле **Query** введите:

```promql
histogram_quantile(0.9, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
```

3. Настройки:
   - **Legend**: `{{route}}` — чтобы видеть маршрут в легенде.
   - **Format**: `Time series`.
   - Единицы (`Unit`): `s` (seconds).
4. Переименуйте панель, например, в **HTTP latency p90 by route**.

#### 3.3. Панель с RPS по методам и статусам

1. Добавьте ещё одну панель (**Add panel**).
2. Введите запрос:

```promql
sum(rate(http_request_duration_seconds_count[5m])) by (method, status)
```

3. Настройки:
   - **Legend**: `{{method}} {{status}}`.
   - **Unit**: `req/s` (requests per second).
4. Назовите панель, например, **HTTP RPS by method & status**.

#### 3.4. Панель с error rate (5xx)

1. Добавьте панель.
2. Запрос:

```promql
sum(rate(http_request_duration_seconds_count{status=~"5.."}[5m])) by (route)
```

3. Настройки:
   - **Legend**: `{{route}}`.
   - **Unit**: `req/s`.
4. Назовите панель, например, **HTTP 5xx error rate**.

#### 3.5. Панель с использованием памяти процесса

1. Добавьте панель.
2. Запрос:

```promql
process_resident_memory_bytes
```

3. Настройки:
   - **Unit**: `bytes` или `decbytes` (для отображения в MB/GB).
4. Назовите панель, например, **Process memory usage**.

#### 3.6. Сохранение дашборда

1. В правом верхнем углу нажмите **Save** (иконка дискеты).
2. Укажите:
   - **Name**: например, `atom-dbro-backend overview`.
   - Папку (если требуется организацией).
3. Нажмите **Save**.

### 4. Фильтры и переменные (по желанию)

Чтобы сделать дашборд более удобным, можно добавить переменные для фильтрации:

1. В верхней части экрана дашборда нажмите на **Dashboard settings** (иконка шестерёнки).
2. Перейдите в раздел **Variables → New variable**.
3. Пример переменной `route`:
   - **Name**: `route`
   - **Type**: `Query`
   - **Data source**: ваш Prometheus.
   - **Query**:

   ```promql
   label_values(http_request_duration_seconds_bucket, route)
   ```

   - Включить `Multi-value` и `Include All option`, если нужно.
4. В запросах на панелях можно использовать переменную:

```promql
histogram_quantile(
  0.9,
  sum(rate(http_request_duration_seconds_bucket{route=~"$route"}[5m]))
  by (le, route)
)
```

Так можно фильтровать графики по конкретным роутам.

### 5. Ручное тестирование графиков

1. Откройте созданный дашборд.
2. Выполните несколько запросов к API backend’а (`/api/...`) через Postman/браузер.
3. Подождите один-два scrape-интервала Prometheus (по умолчанию ~15 секунд).
4. Убедитесь, что:
   - на графиках появились точки/линии;
   - RPS и latency меняются при нагрузке;
   - error rate (5xx) остаётся близким к нулю (если нет ошибок).

### 6. Рекомендации по дальнейшему развитию

- Добавить бизнес-метрики (например, количество созданных квестов/пользователей) в коде и визуализировать их отдельным дашбордом.
- Создать дашборд для SLO:
  - целевой p95 latency;
  - допустимый уровень ошибок (например, 0.1% 5xx).
- Настроить алерты на основе запросов Prometheus (через Alertmanager или встроенные alerting-функции в Grafana, если это поддерживается вашей инсталляцией).


