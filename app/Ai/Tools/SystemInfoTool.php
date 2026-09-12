<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class SystemInfoTool implements Tool
{
    /**
     * Get the description of the tool's purpose.
     */
    public function description(): Stringable|string
    {
        return 'Get the current system date, time, day of the week, and timezone configuration.';
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): Stringable|string
    {
        $now = now();

        return json_encode([
            'current_datetime' => $now->toIso8601String(),
            'formatted_time' => $now->format('l, F j, Y g:i:s A'),
            'timezone' => config('app.timezone', 'UTC'),
            'timestamp' => $now->timestamp,
        ], JSON_PRETTY_PRINT);
    }

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'timezone' => $schema->string()->description('Optional timezone to format the time in, e.g. "Asia/Kolkata", "UTC", "America/New_York"'),
        ];
    }
}
