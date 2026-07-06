<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Permanently delete all health data and users (GDPR/privacy compliance)
Artisan::command('dot:delete-all-data', function () {
    if (! $this->confirm('This will permanently delete ALL users, cycle data, and family data. Are you sure?')) {
        return;
    }

    \App\Models\SymptomLog::query()->delete();
    \App\Models\Note::query()->delete();
    \App\Models\PeriodLog::query()->delete();
    \App\Models\CycleProfile::query()->delete();
    \App\Models\FamilyMember::query()->delete();
    \App\Models\Family::query()->delete();
    \Laravel\Sanctum\PersonalAccessToken::query()->delete();
    \App\Models\User::query()->delete();

    $this->info('All data permanently deleted.');
})->purpose('Delete all user and health data');
