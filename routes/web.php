<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReceiptExportController;
use App\Http\Controllers\ReceiptQueryController;
use App\Http\Controllers\ReceiptScanController;
use App\Http\Controllers\SiteProjectController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/tools/expenses', [ExpenseController::class, 'index'])->name('tools.expenses');
    Route::post('/tools/expenses/scan-receipt', ReceiptScanController::class)
        ->middleware('throttle:10,1')
        ->name('tools.expenses.scan-receipt');
    Route::post('/tools/receipts/query', ReceiptQueryController::class)
        ->middleware('throttle:20,1')
        ->name('tools.receipts.query');
    Route::get('/tools/receipts/export', ReceiptExportController::class)->name('tools.receipts.export');
    Route::get('/tools/receipts/{expense}/file', [ExpenseController::class, 'showReceipt'])->name('tools.receipts.show');
    Route::post('/tools/expenses', [ExpenseController::class, 'store'])->name('tools.expenses.store');
    Route::post('/tools/receipts', [ExpenseController::class, 'storeReceipt'])->name('tools.receipts.store');
    Route::patch('/tools/expenses/{expense}', [ExpenseController::class, 'update'])->name('tools.expenses.update');
    Route::delete('/tools/expenses/{expense}', [ExpenseController::class, 'destroy'])->name('tools.expenses.destroy');
    Route::post('/tools/projects', [SiteProjectController::class, 'store'])->name('tools.projects.store');
    Route::get('/tools/calculators', fn () => Inertia::render('Tools/Calculators'))->name('tools.calculators');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
