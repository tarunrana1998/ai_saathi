<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use function Laravel\Ai\agent;

Route::inertia('/', 'welcome')->name('home');

Route::match(['get', 'post'], '/prompt', function (Request $request) {
    $prompt = $request->input('message') ?? $request->input('prompt') ?? 'Say hello from Gemini in one sentence!';

    $response = agent('You are a helpful AI assistant.')->prompt($prompt);

    return response()->json([
        'prompt' => $prompt,
        'response' => (string) $response,
    ]);
})->name('prompt');
