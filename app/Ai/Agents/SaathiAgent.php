<?php

namespace App\Ai\Agents;

use App\Ai\Tools\CalculatorTool;
use App\Ai\Tools\SystemInfoTool;
use Laravel\Ai\Attributes\Model;
use Laravel\Ai\Concerns\RemembersConversations;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Promptable;
use Laravel\Ai\Providers\Tools\WebSearch;
use Stringable;

#[Model('gemini-3.6-flash')]
class SaathiAgent implements Agent, Conversational, HasTools
{
    use Promptable, RemembersConversations;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return 'You are AI Saathi, an advanced, intelligent, and friendly AI co-pilot. You have access to tools for live web search, system information, and mathematical calculations. Use them automatically whenever needed to provide accurate, real-time, and verified responses.';
    }

    /**
     * Get the tools available to the agent.
     *
     * @return iterable<\Laravel\Ai\Contracts\Tool|\Laravel\Ai\Providers\Tools\ProviderTool>
     */
    public function tools(): iterable
    {
        return [
            new WebSearch,
            new SystemInfoTool,
            new CalculatorTool,
        ];
    }
}
