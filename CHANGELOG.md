# Changelog

All notable changes to this project will be documented in this file.

## [0.8.6] - 2026-06-13
### Added
- **Редизайн картки профілю**: Змінено дизайн картки активного учасника на преміальну плаваючу панель з заокругленими кутами, матовою розсіяною напівпрозорістю та повноцінним круговим бейджем з позицією в рейтингу (rank) ліворуч.
### Fixed
- **Безпека авторизації**: Впроваджено сучасне хешування паролів за допомогою алгоритму `bcrypt` (`bcryptjs`), повністю замінивши застаріле використання SHA-256 для авторизації адміністратора, усуваючи зауваження CodeQL. Забезпечено повну зворотну сумісність для текстових паролів в оточенні та наявних базах даних.
- **Очищення спадщини**: Офіційно припинено підтримку та видалено згадки класичної версії (bare-metal/Systemd) та гілки `classic`.

## [0.8.5] - 2026-06-12
### Fixed
- **Імпорт історичних повідомлень**: Додано імпорт історичних повідомлень із завантажуваного JSON-файлу експорту Telegram у таблицю `messages` бази даних. Це дозволяє Telegram-боту успішно знаходити авторів оригінальних повідомлень при додаванні нових реакцій та коректно нараховувати карму й оновлювати дату футера.

## [0.8.4] - 2026-06-12
### Added
- **Динамічне оновлення часу в футері**: Додано автоматичне оновлення мітки часу останнього оновлення даних (`last_update`) у базі даних SQLite при кожному отриманні ботом нового повідомлення або зміні реакції на повідомлення.

## [0.8.3] - 2026-06-12
### Fixed
- **Аварійне завершення бота**: Додано обробку анонімних/канальних повідомлень без відправника (`ctx.from = undefined`), що запобігає падінню бота.
- **Timing-Safe Auth**: Захищено перевірку пароля в адмін-панелі від Timing-атак за допомогою криптографічного порівняння SHA-256 хешів.
- **Захист від DoS при імпорті**: Встановлено ліміт у 50 МБ на завантаження JSON-файлів у Multer та додано Express middleware для обробки помилок розміру.
- **Шлях до бази в update_names.js**: Виправлено утиліту оновлення імен, яка тепер коректно використовує `process.env.DB_PATH` у Docker.
### Added
- **Інструкція з налаштування бота**: Додано покроковий посібник з налаштування Telegram-бота, вимкнення приватності (Group Privacy) та додавання в групу до файлу `README.md`.

## [0.8.2] - 2026-06-12
### Changed
- **Редізайн картки профілю**: Відновлено матову розсіяну напівпрозорість (`rgba(12, 13, 18, 0.75) !important` з ефектом розмиття `backdrop-filter`) та оригінальну docked-форму внизу екрана для картки профілю користувача.

## [0.8.1] - 2026-06-12
### Fixed
- **Усунення вразливості авторизації в адмін-панелі**: Закрито потенційний обхід авторизації з паролем за замовчуванням `[REDACTED]` у разі відсутності налаштувань.
- **Транзакційність імпорту JSON**: Деструктивні запити очищення бази даних перенесено всередину транзакцій для запобігання втрати даних при помилках імпорту.
- **Підтримка HEAD-запитів**: Виправлено повернення статусу 404 на HEAD-запити для кращої сумісності з моніторингом аптайму та SEO.
- **Синхронізація скрипта імпорту**: Оновлено консольну утиліту `import_json.js` для повної сумісності з новою схемою бази даних та категоріями реакцій.

## [0.8.0] - 2026-05-29
### Added
- **Оновлені скріншоти у README.md**: Замінено застарілі скріншоти дашборду рейтингу та адмін-панелі на нові актуальні (`karma-community-app!.png` та `karma-community-app-admin-panel.png`), які відображають новий преміальний OLED дизайн та розділ почесного місця власника чату.

## [0.7.9] - 2026-05-29
### Added
- **Підтримка channel ID у Telegram імпорті**: Виправлено проблему, коли при ручному імпорті JSON-файлу повідомлення від імені каналів (як-от від імені власника чи пов'язаного каналу, наприклад, `channel2297257604`) повністю ігнорувалися та не додавалися до бази даних. Тепер імпортуються повідомлення з префіксами `user` та `channel`.

## [0.7.8] - 2026-05-29
### Fixed
- **Покращений пошук власника чату**: Виправлено проблему, коли рейтинг власника не відображався при введенні ID з префіксом `user` (наприклад, `user122103145` з експортованого Telegram JSON). Тепер бекенд автоматично очищує префікс `user`, а також підтримує пошук за юзернеймом (як з `@`, так і без) або за відображуваним ім'ям (першим ім'ям) користувача.

## [0.7.7] - 2026-05-29
### Added
- **Почесне місце власника чату**: Додано можливість вказати Telegram ID власника чату/групи в налаштуваннях адмін-панелі. Власник відображається окремо на почесному місці зверху рейтингу з короною 👑 замість порядкового номера, і виключається зі звичайного списку учасників.

## [0.7.6] - 2026-05-29
### Fixed
- **Динамічна дата оновлення рейтингу**: Виправлено проблему, через яку при ручному імпорті JSON-файлу у футері не оновлювалась дата та час оновлення таблиці рейтингу. Тепер дата оновлюється автоматично у часовому поясі Києва (`Europe/Kyiv`) і відображається динамічно на клієнті.

## [0.7.5] - 2026-05-28
### Added
- **Класифікація реакцій за лінзами**: Поділ реакцій на Флудерів (меми), Гуру (база/експертиза) та Скептиків (думерство/ризики).
- **Лінійні діаграми (Stacked Bar Charts)**: Візуальне відображення часток категорій у кожного учасника з абсолютними числовими показниками.
- **Легенда рейтингу**: Детальний опис розподілу емодзі-реакцій на початку списку.
- **Екран онбордингу**: Зручні покрокові інструкції з налаштування бота та імпорту історії чату при порожній базі даних.
- **Оновлений скріншот**: Замінено головний скріншот проєкту для відображення нових stacked charts та легенди.

## [0.7.4] - 2026-05-22
### Added
- **Premium Dark Redesign**: OLED-friendly dark background (`#0c0d12`), Inter font, subtle mesh gradients, and layered glassmorphism.
- **Leaderboard Animations**: Staggered `fadeInUp` entrance animations for leaderboard items to improve perceived speed.
- **UI Visual Polish**: Medal-styled rank badges, bottom bar with blur and safe-area inset, shimmer loader animation, and focus glow rings on admin input fields.
### Fixed
- **Glass Panel Styling**: Replaced semi-transparent glass background with solid OLED-black to fix contrast issues.
- **Security Hardening**: Ignored Telegram history export (`result-*.json`) files in `.gitignore` and purged them from repository history to prevent accidental data leaks.

## [0.7.3] - 2026-05-11
### Added
- **Multi-Emoji Support**: Added support for 7 emoji reactions (🔥, ❤️, 👍, 👏, 🏆, 💯, ⚡️) when parsing Telegram chat history JSON.
- **Visual Clarification**: Updated the dashboard to clarify that the 🔥 icon represents the sum of all supported emoji reactions.
### Fixed
- **Parsing**: Fixed emoji variation selector matching in the JSON importer to ensure all Telegram-exported emojis are counted correctly.

## [0.7.2] - 2026-05-09
### Added
- **Secure First-Run Setup**: New installations now prompt the user to create an admin password on their first visit to the `/admin` panel.
### Fixed
- **Security**: Removed the hardcoded default admin password, significantly improving out-of-the-box security for self-hosted instances.

## [0.7.1] - 2026-05-09
### Fixed
- **Security Vulnerability**: Fixed a critical XSS vulnerability in the `ip-address` library by upgrading to version 10.1.1.
- **Dependencies**: Updated `express-rate-limit` and other backend dependencies to ensure a secure and stable environment. Confirmed 0 vulnerabilities via `npm audit`.

## [0.7.0] - 2026-05-09
### Added
- **Docker Edition**: Complete transition to a containerized architecture. The project now includes a optimized Dockerfile and a multi-tenant `docker-compose.yml` for easy scaling.
- **Improved Deployment**: Simplified setup for multiple community instances on a single host.
- **Documentation**: Updated README with architectural diagrams, Docker-first instructions, and new screenshots.

## [0.6.1] - 2026-05-03
### Fixed
- **Frontend Empty State Bug**: Added a robust retry mechanism to the frontend. It now gracefully waits and reconnects if the backend is temporarily unavailable (e.g., during the automatic restart triggered by saving settings in the Admin panel), preventing the leaderboard from falsely showing as empty.

## [0.6.0] - 2026-05-03
### Added
- **Zero Karma Tracking**: Users with 0 karma now appear on the leaderboard after a JSON data import.
- **Chronological Sorting**: The leaderboard and API now strictly respect the time a user was added to the chat (using message timestamps or exact addition time). Users with equal karma are sorted correctly by seniority in the community.
- **Database Schema Upgrade**: Automatically adds `join_date` to existing SQLite databases without losing data.

## [0.5.0] - 2026-05-03
### Added
- **Dynamic Settings via Admin Panel**: You can now configure Site Title, Telegram Bot Token, WebApp URL, and Chat ID dynamically via the `/admin` interface without touching `.env` or code.
- **Easy Onboarding**: Database now auto-generates a `settings` table to store configurations securely via SQLite.
- **Target Chat Restrictions**: The bot can now optionally be restricted to a specific Telegram Chat ID.

## [0.4.0] - 2026-05-03
### Added
- **Admin Panel**: Added protected `/admin` route with UI for uploading `result.json` backups.
- **Data Import**: Backend now securely processes `.json` files, wipes old data safely, and updates Karma leaderboard on the fly via multer endpoint.
- **PWA Support**: Added `manifest.json` allowing the community app to be installed natively on mobile devices.
- **SEO & Social Graph**: Added Open Graph metadata (`og:image`, `twitter:card`) and `og-image.png` for rich link previews in Telegram and Twitter.
