<?php

namespace Database\Seeders;

use App\Models\CycleProfile;
use App\Models\Family;
use App\Models\FamilyMember;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $child = User::create([
            'name'     => 'Child',
            'email'    => 'child@dot.family',
            'password' => Hash::make('password'),
            'role'     => 'child',
        ]);

        $dad = User::create([
            'name'     => 'Dad',
            'email'    => 'dad@dot.family',
            'password' => Hash::make('password'),
            'role'     => 'parent',
        ]);

        $mom = User::create([
            'name'     => 'Mom',
            'email'    => 'mom@dot.family',
            'password' => Hash::make('password'),
            'role'     => 'parent',
        ]);

        $family = Family::create(['name' => 'Our Family']);

        // Parent order matters: index 0 = parent_1, index 1 = parent_2
        FamilyMember::create(['family_id' => $family->id, 'user_id' => $child->id, 'role' => 'child']);
        FamilyMember::create(['family_id' => $family->id, 'user_id' => $dad->id,   'role' => 'parent']);
        FamilyMember::create(['family_id' => $family->id, 'user_id' => $mom->id,   'role' => 'parent']);

        CycleProfile::create([
            'owner_user_id'        => $child->id,
            'family_id'            => $family->id,
            'average_cycle_length' => 28,
            'share_level'          => 'basic',
            'share_with_parent_1'  => false,
            'share_with_parent_2'  => false,
        ]);

        $this->command->info('');
        $this->command->info('Seed complete. Login credentials:');
        $this->command->table(
            ['Role', 'Email', 'Password'],
            [
                ['Child', 'child@dot.family', 'password'],
                ['Dad',   'dad@dot.family',   'password'],
                ['Mom',   'mom@dot.family',   'password'],
            ]
        );
        $this->command->warn('Change all passwords before deploying to production.');
    }
}
