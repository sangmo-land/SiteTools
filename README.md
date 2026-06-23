# SiteTools

SiteTools is a Laravel, React, Inertia.js, and Tailwind CSS app for construction site operations.

## Features

- Authenticated dashboard with site spend summaries, category mix, monthly trend, recent purchases, and project budget progress.
- Expense tracker for materials, suppliers, payment method, project allocation, and receipt attachments.
- Browser-side receipt OCR for image receipts using Tesseract.js, with searchable OCR text saved to each expense.
- Project setup for separating site budgets and purchase records.
- Field calculators for concrete volume, block estimates, paint quantities, and common unit conversions.

## Local Setup

```bash
composer install
npm install
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
