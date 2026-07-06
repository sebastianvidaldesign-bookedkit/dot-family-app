<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CycleProfileController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\ParentDashboardController;
use App\Http\Controllers\PeriodLogController;
use Illuminate\Support\Facades\Route;

// Public auth routes
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
});

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);

    // Child-only routes
    Route::middleware('role:child')->group(function () {
        Route::get('period-logs', [PeriodLogController::class, 'index']);
        Route::post('period-logs', [PeriodLogController::class, 'upsert']);
        Route::get('period-logs/prediction', [PeriodLogController::class, 'prediction']);

        Route::get('cycle-profile', [CycleProfileController::class, 'show']);
        Route::patch('cycle-profile', [CycleProfileController::class, 'update']);

        Route::get('notes', [NoteController::class, 'index']);
        Route::post('notes', [NoteController::class, 'store']);
        Route::put('notes/{note}', [NoteController::class, 'update']);
        Route::delete('notes/{note}', [NoteController::class, 'destroy']);
    });

    // Parent-only routes
    Route::middleware('role:parent')->group(function () {
        Route::get('parent/dashboard', [ParentDashboardController::class, 'index']);
    });
});
