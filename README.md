# SiteTools

SiteTools is a Laravel, React, Inertia.js, and Tailwind CSS app for construction site operations.

## Features

- Authenticated dashboard with FCFA site spend summaries, category mix, monthly trend, recent purchases, and project budget progress.
- Expense tracker for catalogue materials, suppliers, payment method, project allocation, and receipt attachments.
- OpenAI-powered receipt scanning for images and PDFs, with searchable text and key purchase fields extracted automatically.
- Filament admin dashboard at `/admin` for managing commonly used materials and default FCFA prices.
- Project setup for separating site budgets and purchase records.
- Field calculators for concrete volume, block estimates, paint quantities, and common unit conversions.

## Local Setup

Copy `.env.example` to `.env` and set `OPENAI_API_KEY` to an API key from the OpenAI API dashboard. `OPENAI_RECEIPT_MODEL` defaults to `gpt-5.4-mini`.

```bash
composer install
npm install
mysql -u root -e "CREATE DATABASE site_tools CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php artisan migrate:fresh --seed
php artisan storage:link
npm run build
php artisan serve
```

The seeded demo account is:

```text
Email: test@example.com
Password: password
```

Use the same account at `/admin` to manage the materials dropdown.

## Development

```bash
npm run dev
php artisan serve
```

Run checks with:

```bash
npm run build
php artisan test
```
