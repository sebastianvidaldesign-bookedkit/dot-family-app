<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'role'];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'password' => 'hashed',
    ];

    public function familyMembers()
    {
        return $this->hasMany(FamilyMember::class);
    }

    public function families()
    {
        return $this->belongsToMany(Family::class, 'family_members');
    }

    public function cycleProfile()
    {
        return $this->hasOne(CycleProfile::class, 'owner_user_id');
    }

    public function isChild(): bool
    {
        return $this->role === 'child';
    }

    public function isParent(): bool
    {
        return $this->role === 'parent';
    }
}
