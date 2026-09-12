<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class CalculatorTool implements Tool
{
    /**
     * Get the description of the tool's purpose.
     */
    public function description(): Stringable|string
    {
        return 'Perform precise arithmetic calculations and mathematical evaluations.';
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): Stringable|string
    {
        $expression = (string) $request['expression'];

        // Clean and sanitize mathematical expression (allow only numbers, operators, parens, decimal, spaces, common math functions)
        $clean = preg_replace('/[^0-9+\-*\/().,%^ \t\n]/', '', $expression);

        if (empty($clean)) {
            return json_encode(['error' => 'Invalid mathematical expression']);
        }

        try {
            // Evaluate safely using basic PHP math
            $result = @eval("return ({$clean});");

            return json_encode([
                'expression' => $expression,
                'result' => $result,
                'status' => 'success',
            ]);
        } catch (\Throwable $e) {
            return json_encode([
                'expression' => $expression,
                'error' => 'Calculation error: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'expression' => $schema->string()->description('The arithmetic expression to evaluate, e.g. "125 * 42.5 + (1000 / 4)"')->required(),
        ];
    }
}
