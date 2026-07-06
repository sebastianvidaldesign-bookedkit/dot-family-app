<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SymptomLog extends Model
{
    protected $fillable = ['period_log_id', 'symptom_type'];

    public function periodLog()
    {
        return $this->belongsTo(PeriodLog::class);
    }
}
