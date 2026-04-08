# Дипломный проект: Интернет-магазин «Муравейник» (ИП)

Соответствует предметной области из ТЗ: **строительные материалы, инструмент, ЛКМ, напольные покрытия**, доставка по городу, оплата (демо ЮKassa / наличные при получении), заказ **с регистрацией и без**, избранное, фильтры и сортировка каталога, админ-панель и смена статусов заказов менеджером, заготовки **1С** и **массовый импорт CSV**.

## Стек:

| Слой    | Технологии                                      |
|---------|--------------------------------------------------|
| Клиент  | React 18, TypeScript, Vite, Redux Toolkit Query |
| Сервер  | Node.js, Express, Prisma ORM, JWT               |
| БД      | PostgreSQL                                     |

## Запуск проекта (подробно):

### Что понадобится:

| Компонент | Зачем |
|-----------|--------|
| [Node.js](https://nodejs.org/) **LTS** (рекомендуется 20.x или 22.x) | Backend и frontend |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | PostgreSQL и опционально Redis / RabbitMQ из `docker-compose.yml` |
| Git | Если клонируете репозиторий |

Проверка версий:




```bash
node -v
npm -v
docker version
```




Команда `docker version` должна показать и **Client**, и **Server**. Если Server отсутствует или есть ошибка — Docker не запущен (см. раздел [Если Docker не подключается](#если-docker-не-подключается-windows)).

### Шаг 1. Запустить Docker Desktop

На **Windows** перед `docker compose` обязательно запустите **Docker Desktop** из меню «Пуск» и дождитесь статуса «Docker Desktop is running» (иконка кита в трее перестаёт анимироваться). Иначе появится ошибка вроде `failed to connect to the docker API` / `dockerDesktopLinuxEngine`.

### Шаг 2. Поднять контейнеры

В корне проекта (папка `muraveynik-diploma`):

```bash
cd muraveynik-diploma
docker compose up -d
```

Поднимаются сервисы:

| Сервис | Образ | Порт на хосте | Назначение |
|--------|--------|----------------|------------|
| **db** | `postgres:16-alpine` | **5433** → 5432 в контейнере | Основная БД приложения (порт 5433 снаружи, чтобы не конфликтовать с локальным PostgreSQL на 5432) |
| **redis** | `redis:7-alpine` | 6379 | Заготовка под кэш/очереди (в `.env` по умолчанию закомментировано) |
| **rabbitmq** | `rabbitmq:3-management-alpine` | 5672 (AMQP), **15672** (веб-UI) | Заготовка под очереди (в `.env` по умолчанию закомментировано) |

Проверка, что контейнеры работают:

```bash
docker compose ps
```

Остановка контейнеров без удаления томов данных:

```bash
docker compose down
```

Полная очистка тома с данными Postgres (осторожно: удалит БД):

```bash
docker compose down -v
```

### Шаг 3. Настроить backend

Перейдите в `backend` и создайте файл `.env` из примера.

**Windows (PowerShell или cmd):**

```bash
cd backend
copy .env.example .env
```

**Linux / macOS:**

```bash
cd backend
cp .env.example .env
```

Минимально для работы API достаточно значений по умолчанию из `.env.example`. Обязательно проверьте строку подключения к Postgres (она должна совпадать с `docker-compose`):

```env
DATABASE_URL="postgresql://mur:mur@127.0.0.1:5433/muraveynik?schema=public"
```

При необходимости раскомментируйте `REDIS_URL` / `RABBITMQ_URL` в `.env`, если будете использовать эти сервисы из compose.

Установите зависимости и подготовьте БД:

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

Запуск API в режиме разработки:

```bash
npm run dev
```

- Сервер: `http://localhost:4000`
- Проверка:
  - В браузере: `http://localhost:4000/api/health`
  - В PowerShell: `Invoke-WebRequest http://localhost:4000/api/health`

### Шаг 4. Запустить frontend

Откройте **новый** терминал (backend должен продолжать работать):

**Windows:**

```bash
cd muraveynik-diploma\frontend
npm install
npm run dev
```

**Linux / macOS:**

```bash
cd muraveynik-diploma/frontend
npm install
npm run dev
```

- Сайт: `http://localhost:5173`
- Запросы к `/api` проксируются на `http://localhost:4000` (см. `frontend/vite.config.ts`).

### Краткий чеклист URL

| Что | Адрес |
|-----|--------|
| Витрина (React) | http://localhost:5173 |
| API | http://localhost:4000 |
| Health | http://localhost:4000/api/health |
| RabbitMQ Management (если поднят compose) | http://localhost:15672 (логин/пароль по умолчанию: `guest` / `guest`) |

### После изменения схемы Prisma

Снова выполните в `backend`:

```bash
npm run db:push
```

При необходимости повторите сид:

```bash
npm run db:seed
```

### Если Docker не подключается (Windows)

1. Запустите **Docker Desktop** и подождите полного старта.
2. Выполните `docker version` — должен быть раздел **Server**.
3. Обновите Docker Desktop; при использовании WSL 2 включите интеграцию с нужным дистрибутивом в настройках Docker.
4. Перезагрузка ПК иногда нужна после первой установки Docker или обновления WSL.

### Если порт занят

- **5433** — занят другим процессом: остановите его или измените проброс порта в `docker-compose.yml` (и `DATABASE_URL` в `.env`).
- **4000** или **5173** — закройте приложение, занявшее порт, или смените порт в `vite.config.ts` (frontend).

### Быстрый старт

После установки Node и запуска Docker Desktop:

```bash
cd muraveynik-diploma
docker compose up -d
cd backend
copy .env.example .env
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Важно: в корне `muraveynik-diploma` файла `package.json` нет, поэтому `npm install`/`npm run ...` выполняйте только в `backend` или `frontend`.

Во втором терминале:

```bash
cd muraveynik-diploma/frontend
npm install
npm run dev
```

На Linux/mac вместо `copy .env.example .env` используйте `cp .env.example .env`.
Если хотите запускать в одну строку на Windows PowerShell 5.1, используйте `;` вместо `&&`.

## Учётные записи (seed)

- Администратор: `admin@muraveynik.local` / `admin123`
- Менеджер заказов: `manager@muraveynik.local` / `manager123`

## API (расширенно)

- **Каталог:** `GET /api/categories`, `GET /api/categories/tree` — иерархия категорий.
- **Товары:** `GET /api/products` — поиск, фильтры (`brand`, `priceMin`, `priceMax`, `inStock`, `isNew`, `sort`), `POST /api/products/by-ids/list` — загрузка по id для гостевой корзины, `GET /api/products/:slug`.
- **Доставка:** `GET /api/delivery/quote?type=COURIER|PICKUP&weightKg=` — расчёт по весу (упрощённая модель «по городу»).
- **Корзина:** `GET|POST|PATCH|DELETE /api/cart` (JWT).
- **Избранное:** `GET|POST|DELETE /api/favorites/:productId` (JWT).
- **Заказы:** `POST /api/orders/guest` — оформление без регистрации; `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id` (JWT).
- **Оплата:** `POST /api/payments/yookassa/demo` — демо ЮKassa: для пользователя передать JWT; для гостя — `guestEmail`, совпадающий с заказом.
- **Админ:** `GET /api/admin/stats`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status`, CRUD товаров, `POST /api/admin/products/import-csv` (тело JSON `{ "csv": "..." }`, разделитель `;`).
- **1С:** `POST /api/integration/1c/import-stock`, `GET /api/integration/logs`.
- **Отзывы:** `GET /api/reviews/product/:productId` (список + средняя оценка), `POST /api/reviews` (JWT, один отзыв на товар с аккаунта), `DELETE /api/reviews/:id` (свой отзыв или админ).


