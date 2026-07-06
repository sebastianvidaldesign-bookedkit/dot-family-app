<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CycleProfileController;
use App\Http\Controllers\FamilyCalendarController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\ParentDashboardController;
use App\Http\Controllers\PeriodLogController;
use App\Http\Controllers\PeriodRangeController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Health check — no auth required
Route::get('health', function () {
    try {
        DB::connection()->getPdo();
        $db = 'connected';
    } catch (\Throwable) {
        $db = 'unavailable';
    }

    $ok = $db === 'connected';

    return response()->json([
        'ok'       => $ok,
        'app'      => 'Dot',
        'database' => $db,
    ], $ok ? 200 : 503);
});

// Public auth routes
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');
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

    // Family calendar — shared by child, dad, and mom
    // All three read/write the child's single cycle_profile via family membership
    Route::prefix('family')->group(function () {
        // Period range endpoints (new model)
        Route::get('ranges',           [PeriodRangeController::class, 'index']);
        Route::post('ranges',          [PeriodRangeController::class, 'upsert']);
        Route::delete('ranges/{id}',   [PeriodRangeController::class, 'destroy']);

        // Prediction (unchanged API surface)
        Route::get('prediction',       [FamilyCalendarController::class, 'prediction']);

        // Legacy individual-day endpoints kept for backward compat
        Route::get('calendar',         [FamilyCalendarController::class, 'index']);
        Route::post('calendar',        [FamilyCalendarController::class, 'upsert']);
        Route::delete('calendar/{date}',[FamilyCalendarController::class, 'destroy']);
    });

    // Parent-only routes
    Route::middleware('role:parent')->group(function () {
        Route::get('parent/dashboard', [ParentDashboardController::class, 'index']);
    });
});
