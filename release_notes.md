# 🚀 Weby-QRank Community App v0.7.0 (Docker Edition)

## 🇺🇦 Що нового (Оновлення)
Це мажорне оновлення, яке повністю переводить архітектуру проєкту на **Docker-first** підхід, що робить його встановлення, масштабування та оновлення надзвичайно простими.

* **Docker Multi-tenancy:** Підтримка роботи кількох екземплярів ботів на одному сервері за допомогою єдиного `docker-compose.yml`. Відтепер бази даних та змінні середовища повністю ізольовані.
* **Оптимізований образ:** Застосунок компілюється в один легкий Docker-образ на базі `node:22-alpine` (розміром ~150 МБ), який містить як скомпільований React SPA, так і Node.js/Express API.
* **Віддача статики через Express:** Вилучено необхідність запускати окремий Vite-сервер. Backend тепер автоматично віддає скомпільовану статику та обробляє SPA fallback-маршрути (`/*`).
* **Виправлення сумісності SQLite:** Усунуто проблеми зібраних бібліотек (C++ Segfaults) під час роботи в Alpine середовищі.
* **Оновлення README:** Документацію переписано під новий архітектурний підхід з використанням актуальних Mermaid-діаграм та інструкцією для `docker-compose`.
* **Скріншоти та Адмінка:** Оновлено графічні матеріали, додано розділ з описом можливостей Адмін-панелі.

---

## 🇬🇧 What's New (Updates)
This is a major release that fully transitions the project architecture to a **Docker-first** approach, making installation, scaling, and updating incredibly easy.

* **Docker Multi-tenancy:** Support for running multiple bot instances on a single server using a single `docker-compose.yml`. Databases and environment variables are now fully isolated.
* **Optimized Image:** The application compiles into a single, lightweight Docker image based on `node:22-alpine` (~150 MB), which includes both the compiled React SPA and the Node.js/Express API.
* **Static Serving via Express:** Removed the need to run a separate Vite server. The backend now automatically serves the compiled static files and handles SPA fallback routes (`/*`).
* **SQLite Compatibility Fixes:** Resolved issues with compiled libraries (C++ Segfaults) when running in an Alpine environment.
* **README Updates:** Documentation has been rewritten for the new architectural approach, featuring updated Mermaid diagrams and `docker-compose` instructions.
* **Screenshots & Admin Panel:** Updated graphical assets and added a section describing the capabilities of the Admin Panel.