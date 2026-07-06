<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PeriodRange extends Model
{
    protected $fillable = [
        'cycle_profile_id',
        'start_date',
        'end_date',
        'flow',
        'symptoms',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date'   => 'date:Y-m-d',
        'symptoms'   => 'array',
    ];

    public function cycleProfile()
    {
        return $this->belongsTo(CycleProfile::class);
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
