<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PeriodLog extends Model
{
    protected $fillable = [
        'cycle_profile_id',
        'date',
        'is_period_day',
        'is_cycle_start',
        'flow',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected $casts = [
        'date'           => 'date:Y-m-d',
        'is_period_day'  => 'boolean',
        'is_cycle_start' => 'boolean',
    ];

    public function cycleProfile()
    {
        return $this->belongsTo(CycleProfile::class);
    }

    public function symptoms()
    {
        return $this->hasMany(SymptomLog::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }
}
