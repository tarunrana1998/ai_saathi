<?php

use App\Ai\Agents\SaathiAgent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Laravel\Ai\Models\Conversation;
use function Laravel\Ai\agent;

Route::inertia('/', 'welcome')->name('home');

// Standalone quick prompt
Route::match(['get', 'post'], '/prompt', function (Request $request) {
    $prompt = $request->input('message') ?? $request->input('prompt') ?? 'Say hello from Gemini in one sentence!';

    $response = agent('You are a helpful AI assistant.')->prompt($prompt);

    return response()->json([
        'prompt' => $prompt,
        'response' => (string) $response,
    ]);
})->name('prompt');

// Conversations & Chat API
Route::prefix('api')->group(function () {
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
                'created_at' => $msg->created_at?->toISOString(),
            ]),
        ]);
    });

    Route::post('/chat', function (Request $request) {
        $request->validate([
            'message' => 'required|string',
            'conversation_id' => 'nullable|string',
        ]);

        $message = $request->input('message');
        $conversationId = $request->input('conversation_id');

        if (! $conversationId || ! Conversation::where('id', $conversationId)->exists()) {
            $conversationId = (string) Str::uuid();
            $title = Str::limit($message, 32, '...');
            Conversation::create([
                'id' => $conversationId,
                'title' => $title,
            ]);
        }

        $agent = (new SaathiAgent)->continue($conversationId);
        $response = $agent->prompt($message);

        $conversation = Conversation::find($conversationId);

        return response()->json([
            'conversation_id' => $conversationId,
            'title' => $conversation?->title,
            'message' => [
                'id' => (string) Str::uuid(),
                'role' => 'assistant',
                'content' => (string) $response,
                'created_at' => now()->toISOString(),
            ],
        ]);
    });

    Route::delete('/conversations/{id}', function (string $id) {
        $conversation = Conversation::findOrFail($id);
        $conversation->messages()->delete();
        $conversation->delete();

        return response()->json(['success' => true]);
    });
});
