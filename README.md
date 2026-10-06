# GREEN-API Web Chat

🌐 **Live Demo (Vercel):** [https://green-api-dun.vercel.app](https://green-api-dun.vercel.app/)  
🎨 **Figma Design:** [Figma Prototype](https://www.figma.com/design/PD5G72LOTG48V2Gw7DAJSN/Green-API-Messanger-Interface?node-id=0-1&p=f&t=2qKKwBPVWGxxyTrU-11)

Веб-клиент мессенджера для обмена сообщениями через REST API сервиса [GREEN-API](https://green-api.com/). 

Интерфейс вдохновлен веб-клиентом мессенджера MAX (web.max.ru) и ориентирован на быстрый и чистый пользовательский опыт без перегруженных элементов.

---

## Возможности

- **Авторизация по инстансу**: вход с использованием `idInstance` и `apiTokenInstance`, проверка состояния инстанса (`getStateInstance`), сохранение сессии в `localStorage`.
- **Создание диалогов**: удобный запуск чата по номеру телефона получателя с автоматической нормализацией международных форматов номеров в `@c.us`.
- **Отправка сообщений**: отправка через метод [`sendMessage`](https://green-api.com/v3/docs/api/sending/SendMessage/) с оптимистичным отображением в интерфейсе и поддержкой горячих клавиш (`Enter` / `Shift+Enter`).
- **Получение сообщений в реальном времени**: обработка очереди входящих уведомлений по технологии очередей HTTP API (`receiveNotification` + `deleteNotification`).
- **Синхронизация**: подгрузка списка активных чатов (`getChats`) и истории сообщений (`getChatHistory`).
- **Статусы сообщений**: отслеживание этапов доставки (отправляется, отправлено, доставлено, прочитано).
- **Поддержка медиа**: отображение и воспроизведение входящих голосовых и аудио-сообщений.
- **Адаптивный дизайн**: полноценный двухпанельный режим на десктопе и плавный однопанельный режим на мобильных экранах.

---

## Стек технологий

- **Next.js 15** (App Router, Client Components)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Solar Icons** (`@solar-icons/react`)
- **Motion** (`motion`)

---

## Быстрый старт

### 1. Установка зависимостей
```bash
npm install
```

### 2. Запуск локального сервера
```bash
npm run dev
```
Приложение будет доступно по адресу: [http://localhost:3000](http://localhost:3000)

### 3. Сборка продакшен-версии
```bash
npm run build
npm run start
```

---

## Использование

1. Открыть веб-клиент в браузере.
2. Ввести `idInstance` и `apiTokenInstance` из личного кабинета GREEN-API.
3. Нажать кнопку создания нового диалога и ввести номер телефона собеседника.
4. Отправить сообщение — получатель получит его в мессенджере.

---

## Автор

- **Темирлан Темиров**
- Telegram: [@betterrman](https://t.me/betterrman)
- LinkedIn: [temirlan-temirov](https://www.linkedin.com/in/temirlan-temirov/)
- GitHub: [@temirovtemirlan](https://github.com/temirovtemirlan)
