<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#059669">
        <meta name="description" content="SiteTools tracks construction material expenses, scans receipts, manages project budgets, and runs field quantity calculators from one workspace.">

        <title inertia>{{ config('app.name', 'SiteTools') }}</title>

        <!-- Icons -->
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="apple-touch-icon" href="/favicon.svg">

        <!-- Social -->
        <meta property="og:title" content="{{ config('app.name', 'SiteTools') }}">
        <meta property="og:description" content="Track material expenses, scan receipts, manage project budgets, and calculate site quantities from one focused workspace.">
        <meta property="og:type" content="website">
        <meta property="og:image" content="/images/site-tools-hero.png">
        <meta name="twitter:card" content="summary_large_image">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
