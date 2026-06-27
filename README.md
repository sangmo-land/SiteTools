# SiteTools

SiteTools is a Laravel, React, Inertia.js, and Tailwind CSS app for construction site operations.

## Features

- Authenticated dashboard with FCFA site spend summaries, category mix, monthly trend, recent purchases, and project budget progress.
- Expense tracker for catalogue materials, suppliers, payment method, project allocation, and receipt attachments.
- Amazon Textract receipt scanning for JPG/PNG images, with searchable text and key purchase fields (vendor, date, totals, line items) extracted automatically.
- Filament admin dashboard at `/admin` for managing commonly used materials and default FCFA prices.
- Project setup for separating site budgets and purchase records.
- Field calculators for concrete volume, block estimates, paint quantities, and common unit conversions.

## Local Setup

Copy `.env.example` to `.env`. Receipt scanning uses Amazon Textract's `AnalyzeExpense` API, so set AWS credentials for an IAM identity that is allowed `textract:AnalyzeExpense`:

```dotenv
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_DEFAULT_REGION=us-east-1
```

Receipt scanning is optional — the rest of the app runs without AWS credentials. When they are absent, the scanner returns a clear "not configured" message and you can enter receipt details manually.

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
