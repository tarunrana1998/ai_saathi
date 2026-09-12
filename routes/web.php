<?php

use App\Ai\Agents\SaathiAgent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Laravel\Ai\Files\Audio;
use Laravel\Ai\Files\Document;
use Laravel\Ai\Files\Image;
use Laravel\Ai\Files\Video;
use Laravel\Ai\Models\Conversation;
use function Laravel\Ai\agent;

use Illuminate\Support\Facades\Cache;

function getGeminiQuota(): array {
    $tpmLimit = (int) env('GEMINI_TPM_LIMIT', env('GEMINI_TOKEN_LIMIT', 250000)); // 250,000 TPM
    $rpmLimit = (int) env('GEMINI_RPM_LIMIT', 5); // 5 RPM
    $rpdLimit = (int) env('GEMINI_RPD_LIMIT', 20); // 20 RPD

    $windowSeconds = 60;
    $now = time();
    $minuteKey = 'gemini_min_' . floor($now / $windowSeconds);
    $dayKey = 'gemini_day_' . date('Y_m_d');

    $tokensUsed = (int) Cache::get($minuteKey . '_tokens', 0);
    $rpmUsed = (int) Cache::get($minuteKey . '_requests', 0);
    $rpdUsed = (int) Cache::get($dayKey . '_requests', 0);

    $tokensRemaining = max(0, $tpmLimit - $tokensUsed);
    $rpmRemaining = max(0, $rpmLimit - $rpmUsed);
    $rpdRemaining = max(0, $rpdLimit - $rpdUsed);

    $resetInSeconds = $windowSeconds - ($now % $windowSeconds);

    return [
        'limit' => $tpmLimit,
        'used' => $tokensUsed,
        'remaining' => $tokensRemaining,
        'percentage' => round(($tokensRemaining / max(1, $tpmLimit)) * 100, 1),
        'rpm_limit' => $rpmLimit,
        'rpm_used' => $rpmUsed,
        'rpm_remaining' => $rpmRemaining,
        'rpd_limit' => $rpdLimit,
        'rpd_used' => $rpdUsed,
        'rpd_remaining' => $rpdRemaining,
        'reset_in_seconds' => $resetInSeconds,
        'window_seconds' => $windowSeconds,
    ];
}

Route::inertia('/', 'welcome')->name('home');

// Standalone quick prompt
Route::match(['get', 'post'], '/prompt', function (Request $request) {
    $prompt = $request->input('message') ?? $request->input('prompt') ?? 'Say hello from Gemini in one sentence!';

    try {
        $response = agent('You are a helpful AI assistant.')->prompt($prompt);

        $totalTokens = $response->usage ? ($response->usage->promptTokens + $response->usage->completionTokens) : 0;
        $minuteKey = 'gemini_min_' . floor(time() / 60);
        $dayKey = 'gemini_day_' . date('Y_m_d');

        Cache::put($minuteKey . '_tokens', (int) Cache::get($minuteKey . '_tokens', 0) + $totalTokens, 120);
        Cache::put($minuteKey . '_requests', (int) Cache::get($minuteKey . '_requests', 0) + 1, 120);
        Cache::put($dayKey . '_requests', (int) Cache::get($dayKey . '_requests', 0) + 1, 86400 * 2);

        return response()->json([
            'prompt' => $prompt,
            'response' => (string) $response,
            'usage' => $response->usage?->toArray() ?? [
                'prompt_tokens' => 0,
                'completion_tokens' => 0,
                'total_tokens' => 0,
            ],
            'quota' => getGeminiQuota(),
        ]);
    } catch (\Throwable $e) {
        $msg = $e->getMessage();
        $code = (str_contains($msg, '429') || str_contains(strtolower($msg), 'quota')) ? 429 : 500;
        return response()->json([
            'error' => $code === 429 ? 'Google Gemini Quota / Rate Limit exceeded. Please wait 1 minute.' : $msg,
            'raw_error' => $msg,
        ], $code);
    }
})->name('prompt');

// Conversations & Chat API
Route::prefix('api')->group(function () {
    Route::get('/quota', function () {
        return response()->json(getGeminiQuota());
    });

    Route::get('/conversations', function () {
        $conversations = Conversation::orderBy('updated_at', 'desc')
            ->select(['id', 'title', 'created_at', 'updated_at'])
            ->get();

        return response()->json($conversations);
    });

    Route::get('/conversations/{id}', function (string $id) {
        $conversation = Conversation::with(['messages' => function ($q) {
            $q->orderBy('created_at', 'asc');
        }])->findOrFail($id);

        return response()->json([
            'id' => $conversation->id,
            'title' => $conversation->title,
            'messages' => $conversation->messages->map(fn ($msg) => [
                'id' => $msg->id,
                'role' => $msg->role,
                'content' => $msg->content,
                'attachments' => $msg->attachments,
                'usage' => $msg->usage,
                'created_at' => $msg->created_at?->toISOString(),
            ]),
        ]);
    });

    Route::post('/chat', function (Request $request) {
        $request->validate([
            'message' => 'nullable|string',
            'conversation_id' => 'nullable|string',
            'files.*' => 'nullable|file|max:20480', // 20MB max per file
            'file' => 'nullable|file|max:20480',
        ]);

        $message = (string) ($request->input('message') ?? 'Please analyze the attached file(s).');
        $conversationId = $request->input('conversation_id');

        if (! $conversationId || ! Conversation::where('id', $conversationId)->exists()) {
            $conversationId = (string) Str::uuid();
            $title = Str::limit($message, 32, '...');
            Conversation::create([
                'id' => $conversationId,
                'title' => $title,
            ]);
        }

        // Convert uploaded files to Laravel AI attachment objects
        $attachments = [];
        $attachmentMeta = [];

        $allUploaded = [];
        if ($request->hasFile('files')) {
            $f = $request->file('files');
            $allUploaded = is_array($f) ? $f : [$f];
        } elseif ($request->hasFile('file')) {
            $allUploaded = [$request->file('file')];
        }

        foreach ($allUploaded as $file) {
            if (! $file || ! $file->isValid()) {
                continue;
            }

            $mime = $file->getClientMimeType() ?: $file->getMimeType() ?: 'application/octet-stream';
            $name = $file->getClientOriginalName();
            $size = $file->getSize();

            $attachmentMeta[] = [
                'name' => $name,
                'mime_type' => $mime,
                'size' => $size,
                'is_image' => str_starts_with($mime, 'image/'),
            ];

            if (str_starts_with($mime, 'image/')) {
                $attachments[] = Image::fromUpload($file);
            } elseif (str_starts_with($mime, 'audio/')) {
                $attachments[] = Audio::fromUpload($file);
            } elseif (str_starts_with($mime, 'video/')) {
                $attachments[] = Video::fromUpload($file);
            } else {
                $attachments[] = Document::fromUpload($file);
            }
        }

        try {
            $agent = (new SaathiAgent)->continue($conversationId);
            $response = $agent->prompt($message, $attachments);

            $conversation = Conversation::find($conversationId);

            $usage = $response->usage ? [
                'prompt_tokens' => $response->usage->promptTokens,
                'completion_tokens' => $response->usage->completionTokens,
                'total_tokens' => $response->usage->promptTokens + $response->usage->completionTokens,
                'reasoning_tokens' => $response->usage->reasoningTokens,
            ] : null;

            $totalTokens = $response->usage ? ($response->usage->promptTokens + $response->usage->completionTokens) : 0;
            $minuteKey = 'gemini_min_' . floor(time() / 60);
            $dayKey = 'gemini_day_' . date('Y_m_d');

            Cache::put($minuteKey . '_tokens', (int) Cache::get($minuteKey . '_tokens', 0) + $totalTokens, 120);
            Cache::put($minuteKey . '_requests', (int) Cache::get($minuteKey . '_requests', 0) + 1, 120);
            Cache::put($dayKey . '_requests', (int) Cache::get($dayKey . '_requests', 0) + 1, 86400 * 2);

            return response()->json([
                'conversation_id' => $conversationId,
                'title' => $conversation?->title,
                'message' => [
                    'id' => (string) Str::uuid(),
                    'role' => 'assistant',
                    'content' => (string) $response,
                    'usage' => $usage,
                    'created_at' => now()->toISOString(),
                ],
                'user_attachments' => $attachmentMeta,
                'usage' => $usage,
                'quota' => getGeminiQuota(),
            ]);
        } catch (\Throwable $e) {
            $raw = $e->getMessage();
            $isQuota = str_contains($raw, '429') || str_contains(strtolower($raw), 'quota') || str_contains(strtolower($raw), 'rate limit');
            
            return response()->json([
                'error' => $isQuota 
                    ? 'Google Gemini API Quota / Rate Limit exceeded. Free tier limit reached. Please wait a minute and retry.'
                    : 'Neural processing error: ' . $raw,
                'raw_error' => $raw,
                'quota' => getGeminiQuota(),
            ], $isQuota ? 429 : 500);
        }
    });

    Route::delete('/conversations/{id}', function (string $id) {
        $conversation = Conversation::findOrFail($id);
        $conversation->messages()->delete();
        $conversation->delete();

        return response()->json(['success' => true]);
    });
});
