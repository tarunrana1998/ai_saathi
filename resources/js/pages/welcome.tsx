import { Head } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';

export default function Welcome() {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const [lastPrompt, setLastPrompt] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        setIsLoading(true);
        setError(null);
        setLastPrompt(trimmed);

        try {
            const res = await fetch('/prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ message: trimmed }),
            });

            if (!res.ok) {
                throw new Error(`Server returned error ${res.status}`);
            }

            const data = await res.json();
            setResponse(data.response || 'No response received.');
            setInput('');
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'An unexpected error occurred.',
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleExampleClick = (example: string) => {
        setInput(example);
    };

    return (
        <>
            <Head title="AI Saathi" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-12 text-neutral-900">
                <div className="w-full max-w-2xl space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            Powered by Gemini
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-neutral-900">
                            AI Saathi
                        </h1>
                        <p className="text-sm text-neutral-600">
                            Ask anything and get an instant response from Gemini.
                        </p>
                    </div>

                    {/* Input Form Card */}
                    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            void handleSubmit(e);
                                        }
                                    }}
                                    placeholder="Type your question or prompt here... (Press Enter to send)"
                                    rows={3}
                                    className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-all"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
                                    <span className="self-center">Try:</span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleExampleClick(
                                                'Explain quantum computing in simple terms',
                                            )
                                        }
                                        className="rounded-lg bg-neutral-100 px-2.5 py-1 text-neutral-700 hover:bg-neutral-200 transition-colors"
                                    >
                                        Quantum computing
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleExampleClick(
                                                'Write a creative haiku about coding in Laravel',
                                            )
                                        }
                                        className="rounded-lg bg-neutral-100 px-2.5 py-1 text-neutral-700 hover:bg-neutral-200 transition-colors"
                                    >
                                        Laravel Haiku
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg
                                                className="size-4 animate-spin"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <span>Send</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Error Box */}
                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            <p className="font-medium">Error:</p>
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Response Card */}
                    {response && (
                        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                    Prompt: "{lastPrompt}"
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setResponse(null);
                                        setLastPrompt(null);
                                    }}
                                    className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="prose prose-sm max-w-none text-neutral-800 leading-relaxed whitespace-pre-wrap">
                                {response}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
