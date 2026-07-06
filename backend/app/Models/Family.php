<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Family extends Model
{
    protected $fillable = ['name'];

    public function members()
    {
        return $this->hasMany(FamilyMember::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'family_members');
    }

    public function cycleProfiles()
    {
        return $this->hasMany(CycleProfile::class);
    }

    public function childUser(): ?User
    {
        return $this->users()->where('role', 'child')->first();
    }

    public function parentUsers()
    {
        return $this->users()->where('role', 'parent')->get();
    }
}
