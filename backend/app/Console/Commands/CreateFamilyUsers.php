<?php

namespace App\Console\Commands;

use App\Models\CycleProfile;
use App\Models\Family;
use App\Models\FamilyMember;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateFamilyUsers extends Command
{
    protected $signature = 'dot:create-family-users
        {--child-email=  : Email for the child account}
        {--child-password= : Password for the child account}
        {--dad-email=    : Email for dad\'s parent account}
        {--dad-password= : Password for dad\'s account}
        {--mom-email=    : Email for mom\'s parent account}
        {--mom-password= : Password for mom\'s account}';

    protected $description = 'Create or update the three private Dot family users (idempotent)';

    public function handle(): int
    {
        $this->info('Setting up Dot family users…');
        $this->newLine();

        // Collect values — prompt interactively if any option was omitted
        $childEmail    = $this->option('child-email')    ?: $this->ask('Child email');
        $childPassword = $this->option('child-password') ?: $this->secret('Child password');
        $dadEmail      = $this->option('dad-email')      ?: $this->ask('Dad email');
        $dadPassword   = $this->option('dad-password')   ?: $this->secret('Dad password');
        $momEmail      = $this->option('mom-email')      ?: $this->ask('Mom email');
        $momPassword   = $this->option('mom-password')   ?: $this->secret('Mom password');

        // Basic validation before touching the database
        if (! $this->validate($childEmail, $childPassword, $dadEmail, $dadPassword, $momEmail, $momPassword)) {
            return self::FAILURE;
        }

        // 1. Create or update each user
        $child = $this->upsertUser($childEmail, $childPassword, 'child', 'Child');
        $dad   = $this->upsertUser($dadEmail,   $dadPassword,   'parent', 'Dad');
        $mom   = $this->upsertUser($momEmail,   $momPassword,   'parent', 'Mom');

        // 2. Create the family if it doesn't exist yet
        $family = Family::firstOrCreate(['name' => 'Our Family']);
        $this->line('  Family        : "' . $family->name . '" (id ' . $family->id . ')');

        // 3. Attach all three users to the family (safe to run again)
        $this->attachToFamily($family, $child, 'child');
        $this->attachToFamily($family, $dad,   'parent');
        $this->attachToFamily($family, $mom,   'parent');

        // 4. Create cycle profile owned by child if it doesn't already exist
        $profile = CycleProfile::firstOrCreate(
            ['owner_user_id' => $child->id],
            [
                'family_id'            => $family->id,
                'average_cycle_length' => 28,
                'share_level'          => 'basic',
                'share_with_parent_1'  => false,
                'share_with_parent_2'  => false,
            ]
        );
        $this->line('  Cycle profile : ' . ($profile->wasRecentlyCreated ? 'created' : 'already exists'));

        $this->newLine();
        $this->info('Done. All three accounts are ready.');
        $this->warn('Keep passwords safe. Never commit real credentials to the repo.');

        return self::SUCCESS;
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private function validate(
        string $childEmail, string $childPassword,
        string $dadEmail,   string $dadPassword,
        string $momEmail,   string $momPassword
    ): bool {
        $ok = true;

        $emails = [
            'child-email' => $childEmail,
            'dad-email'   => $dadEmail,
            'mom-email'   => $momEmail,
        ];

        foreach ($emails as $option => $value) {
            if (! filter_var($value, FILTER_VALIDATE_EMAIL)) {
                $this->error("--{$option} is not a valid email address.");
                $ok = false;
            }
        }

        $passwords = [
            'child-password' => $childPassword,
            'dad-password'   => $dadPassword,
            'mom-password'   => $momPassword,
        ];

        foreach ($passwords as $option => $value) {
            if (strlen($value) < 8) {
                $this->error("--{$option} must be at least 8 characters.");
                $ok = false;
            }
        }

        // Warn on duplicate emails without blocking
        $allEmails = array_values($emails);
        if (count($allEmails) !== count(array_unique($allEmails))) {
            $this->warn('Two or more accounts share the same email address.');
        }

        return $ok;
    }

    private function upsertUser(string $email, string $password, string $role, string $label): User
    {
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name'     => $label,
                'password' => Hash::make($password),
                'role'     => $role,
            ]
        );

        $action = $user->wasRecentlyCreated ? 'created' : 'updated';
        // Never print the password — only log email and action
        $this->line(sprintf('  %-13s : %s (%s)', $label, $action, $email));

        return $user;
    }

    private function attachToFamily(Family $family, User $user, string $role): void
    {
        FamilyMember::updateOrCreate(
            ['family_id' => $family->id, 'user_id' => $user->id],
            ['role' => $role]
        );
    }
}
