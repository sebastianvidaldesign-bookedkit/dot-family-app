<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CycleProfile extends Model
{
    protected $fillable = [
        'owner_user_id',
        'family_id',
        'average_cycle_length',
        'share_level',
        'share_with_parent_1',
        'share_with_parent_2',
    ];

    protected $casts = [
        'share_with_parent_1' => 'boolean',
        'share_with_parent_2' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function family()
    {
        return $this->belongsTo(Family::class);
    }

    public function periodLogs()
    {
        return $this->hasMany(PeriodLog::class);
    }

    public function periodRanges()
    {
        return $this->hasMany(PeriodRange::class);
    }

    public function notes()
    {
        return $this->hasMany(Note::class);
    }
}
