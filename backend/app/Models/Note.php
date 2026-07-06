<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    protected $fillable = ['cycle_profile_id', 'date', 'body', 'visibility'];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'body' => 'encrypted',
    ];

    public function cycleProfile()
    {
        return $this->belongsTo(CycleProfile::class);
    }
}
