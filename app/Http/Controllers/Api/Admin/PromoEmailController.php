<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\SendPromoEmailJob;
use App\Models\Business;
use App\Models\EmailTemplate;
use App\Models\User;
use Illuminate\Http\Request;

class PromoEmailController extends Controller
{
    public function send(Request $request)
    {
        $validated = $request->validate([
            'subject'      => 'required|string|max:255',
            'body_html'    => 'required|string',
            'target'       => 'required|in:all,active,expired,trial',
            'business_ids' => 'nullable|array',
            'business_ids.*' => 'integer|exists:businesses,id',
        ]);

        // Resolve recipients
        if (!empty($validated['business_ids'])) {
            $users = User::whereIn('business_id', $validated['business_ids'])
                ->where('role', 'owner')
                ->whereNotNull('email_verified_at')
                ->get(['id', 'name', 'email']);
        } else {
            $query = User::where('role', 'owner')->whereNotNull('email_verified_at');

            match ($validated['target']) {
                'active'  => $query->whereHas('business', fn($q) => $q->where('subscription_expires_at', '>', now())),
                'expired' => $query->whereHas('business', fn($q) => $q->where('subscription_expires_at', '<=', now())->whereNotNull('subscription_expires_at')),
                'trial'   => $query->whereHas('business', fn($q) => $q->whereNull('subscription_expires_at')),
                default   => null,
            };

            $users = $query->get(['id', 'name', 'email']);
        }

        if ($users->isEmpty()) {
            return $this->error('No recipients found for the selected target.', 422);
        }

        // Dispatch a job per recipient (queued)
        foreach ($users as $user) {
            SendPromoEmailJob::dispatch(
                $user->email,
                $user->name,
                $validated['subject'],
                $validated['body_html'],
            );
        }

        return $this->success([
            'queued' => $users->count(),
        ], "Promotional email queued for {$users->count()} recipient(s).");
    }
}
