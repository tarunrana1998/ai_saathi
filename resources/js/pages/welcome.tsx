import { Head } from '@inertiajs/react';
import { Bot, Check, Copy, Menu, MessageSquare, Plus, Send, Sparkles, Trash2, User, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at?: string;
}

interface Conversation {
    id: string;
    title: string;
    created_at?: string;
    updated_at?: string;
}

export default function Welcome() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Load conversations list on mount
    const fetchConversations = async () => {
        try {
            const res = await fetch('/api/conversations');
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (e) {
            console.error('Failed to load conversations', e);
        }
    };

    useEffect(() => {
        void fetchConversations();
    }, []);

    // Load messages when selecting a conversation
    const selectConversation = async (id: string) => {
        setActiveConversationId(id);
        setSidebarOpen(false);
        setIsLoading(true);
        try {
            const res = await fetch(`/api/conversations/${id}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (e) {
            console.error('Failed to fetch conversation messages', e);
        } finally {
            setIsLoading(false);
        }
    };

    // Start a new chat
    const handleNewChat = () => {
        setActiveConversationId(null);
        setMessages([]);
        setInput('');
        setSidebarOpen(false);
        textareaRef.current?.focus();
    };

    // Delete a conversation
    const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/conversations/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setConversations((prev) => prev.filter((c) => c.id !== id));
                if (activeConversationId === id) {
                    handleNewChat();
                }
            }
        } catch (e) {
            console.error('Failed to delete conversation', e);
        }
    };

    // Submit message
    const handleSubmit = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMsg: Message = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: trimmed,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    message: trimmed,
                    conversation_id: activeConversationId,
                }),
            });

            if (!res.ok) {
                throw new Error(`Server returned error ${res.status}`);
            }

            const data = await res.json();

            // Update conversation id if new chat
            if (!activeConversationId && data.conversation_id) {
                setActiveConversationId(data.conversation_id);
            }

            // Append assistant response
            if (data.message) {
                setMessages((prev) => [...prev, data.message]);
            }

            // Refresh conversations list to update titles/ordering
            void fetchConversations();
        } catch (err: unknown) {
            const errorMsg: Message = {
                id: `err-${Date.now()}`,
                role: 'assistant',
                content: err instanceof Error ? `Error: ${err.message}` : 'Something went wrong while connecting to Gemini.',
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    // Copy response text
    const handleCopy = (text: string, index: number) => {
        void navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const starterPrompts = [
        {
            title: 'Explain a Concept',
            desc: 'Explain quantum computing simply',
            prompt: 'Explain quantum computing in simple terms with an everyday analogy.',
        },
        {
            title: 'Code & Debug',
            desc: 'Write a Laravel custom middleware',
            prompt: 'Show me an example of how to create and register a custom middleware in Laravel.',
        },
        {
            title: 'Creative Writing',
            desc: 'Write a poem about Artificial Intelligence',
            prompt: 'Write a short and inspiring poem about human and artificial intelligence collaboration.',
        },
        {
            title: 'Problem Solving',
            desc: 'Best practices for API design',
            prompt: 'What are the top 5 best practices for designing scalable RESTful APIs?',
        },
    ];

    return (
        <>
            <Head title="AI Saathi - Chat" />

            <div className="flex h-screen w-full overflow-hidden bg-white text-neutral-900 antialiased">
                {/* Mobile Backdrop */}
                {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden" />}

                {/* Left Sidebar */}
                <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-neutral-200 bg-neutral-50 transition-transform duration-300 md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    {/* Sidebar Header */}
                    <div className="flex items-center justify-between border-b border-neutral-200/80 p-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-neutral-900 text-white shadow-xs">
                                <Sparkles className="size-4" />
                            </div>
                            <span className="text-base font-semibold tracking-tight text-neutral-900">AI Saathi</span>
                        </div>
                        <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200 md:hidden">
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* New Chat Button */}
                    <div className="p-3">
                        <button type="button" onClick={handleNewChat} className="flex w-full items-center justify-between rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-medium text-neutral-900 shadow-xs transition-all hover:border-neutral-400 hover:bg-neutral-100">
                            <div className="flex items-center gap-2">
                                <Plus className="size-4 text-neutral-600" />
                                <span>New chat</span>
                            </div>
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500">⌘K</span>
                        </button>
                    </div>

                    {/* Chat History List */}
                    <div className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
                        <div className="px-2 pb-1.5 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">Recent Chats</div>

                        {conversations.length === 0 ? (
                            <div className="px-3 py-8 text-center text-xs text-neutral-400">No past conversations yet.</div>
                        ) : (
                            conversations.map((conv) => {
                                const isActive = activeConversationId === conv.id;
                                return (
                                    <div
                                        key={conv.id}
                                        onClick={() => void selectConversation(conv.id)}
                                        className={`group relative flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'bg-neutral-200/80 font-medium text-neutral-900' : 'text-neutral-700 hover:bg-neutral-200/50 hover:text-neutral-900'}`}
                                    >
                                        <div className="flex items-center gap-2.5 truncate pr-6">
                                            <MessageSquare className="size-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-600" />
                                            <span className="truncate">{conv.title || 'Untitled chat'}</span>
                                        </div>

                                        <button type="button" title="Delete chat" onClick={(e) => void handleDeleteConversation(e, conv.id)} className="rounded p-1 text-neutral-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-neutral-300/70 hover:text-red-600">
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Sidebar Footer */}
                    <div className="border-t border-neutral-200 bg-neutral-50 p-3.5">
                        <div className="flex items-center justify-between text-xs text-neutral-500">
                            <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-emerald-500" />
                                <span>Gemini 3.6 Flash</span>
                            </span>
                            <span className="font-mono text-[11px] text-neutral-400">v1.0</span>
                        </div>
                    </div>
                </aside>

                {/* Main Chat View */}
                <main className="flex h-full flex-1 flex-col overflow-hidden bg-white">
                    {/* Top Header Navbar */}
                    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200/80 px-4">
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 md:hidden" title="Open Sidebar">
                                <Menu className="size-5" />
                            </button>

                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-neutral-900 md:text-base">AI Saathi</span>
                                <span className="rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">Gemini</span>
                            </div>
                        </div>

                        <button type="button" onClick={handleNewChat} className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100">
                            <Plus className="size-3.5" />
                            <span className="hidden sm:inline">New Chat</span>
                        </button>
                    </header>

                    {/* Chat Messages Stream Area */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
                        <div className="mx-auto max-w-3xl space-y-6">
                            {messages.length === 0 ? (
                                /* Empty / Starter State */
                                <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 text-center">
                                    <div className="space-y-2">
                                        <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-md">
                                            <Sparkles className="size-6" />
                                        </div>
                                        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">How can I help you today?</h2>
                                        <p className="max-w-md text-sm text-neutral-500">AI Saathi remembers the entire conversation context and helps you brainstorm, code, and learn.</p>
                                    </div>

                                    {/* Starter Cards Grid */}
                                    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                                        {starterPrompts.map((card, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => {
                                                    setInput(card.prompt);
                                                    textareaRef.current?.focus();
                                                }}
                                                className="group flex flex-col items-start rounded-xl border border-neutral-200 p-4 text-left shadow-2xs transition-all hover:border-neutral-300 hover:bg-neutral-50/80"
                                            >
                                                <span className="text-sm font-semibold text-neutral-800 group-hover:text-neutral-950">{card.title}</span>
                                                <span className="mt-0.5 line-clamp-1 text-xs text-neutral-500">{card.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                /* Message Bubble Stream */
                                messages.map((msg, idx) => {
                                    const isUser = msg.role === 'user';
                                    return (
                                        <div key={msg.id || idx} className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                            {!isUser && (
                                                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white shadow-xs select-none">
                                                    <Bot className="size-4" />
                                                </div>
                                            )}

                                            <div className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? 'rounded-br-xs bg-neutral-900 text-white' : 'rounded-tl-xs border border-neutral-200/70 bg-neutral-100 text-neutral-900'}`}>
                                                <div className="whitespace-pre-wrap">{msg.content}</div>

                                                {!isUser && (
                                                    <div className="mt-2 flex items-center justify-end border-t border-neutral-200/50 pt-1">
                                                        <button type="button" onClick={() => handleCopy(msg.content, idx)} className="flex items-center gap-1 text-[11px] text-neutral-500 transition-colors hover:text-neutral-800" title="Copy to clipboard">
                                                            {copiedIndex === idx ? (
                                                                <>
                                                                    <Check className="size-3 text-emerald-600" />
                                                                    <span className="text-emerald-600">Copied</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="size-3" />
                                                                    <span>Copy</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {isUser && (
                                                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs text-neutral-700 shadow-xs select-none">
                                                    <User className="size-4" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}

                            {/* Loading State / Typing Dots */}
                            {isLoading && (
                                <div className="flex items-center gap-3.5">
                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs text-white">
                                        <Bot className="size-4 animate-pulse" />
                                    </div>
                                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-xs border border-neutral-200/70 bg-neutral-100 px-4 py-3">
                                        <div className="size-2 animate-bounce rounded-full bg-neutral-400" />
                                        <div className="size-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:0.2s]" />
                                        <div className="size-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Bottom Floating Input Bar */}
                    <div className="shrink-0 border-t border-neutral-200/80 bg-white p-4">
                        <div className="mx-auto max-w-3xl">
                            <form
                                onSubmit={(e) => void handleSubmit(e)}
                                className="relative flex items-center rounded-2xl border border-neutral-300 bg-neutral-50 px-4 py-2.5 shadow-2xs transition-all focus-within:border-neutral-900 focus-within:bg-white focus-within:ring-1 focus-within:ring-neutral-900"
                            >
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            void handleSubmit();
                                        }
                                    }}
                                    placeholder="Message AI Saathi... (Enter to send, Shift+Enter for newline)"
                                    rows={1}
                                    className="max-h-32 flex-1 resize-none bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                                    style={{
                                        minHeight: '24px',
                                        height: 'auto',
                                    }}
                                />

                                <button type="submit" disabled={!input.trim() || isLoading} className="ml-2 flex size-8 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-30" title="Send message">
                                    <Send className="size-4" />
                                </button>
                            </form>

                            <p className="mt-2 text-center text-[11px] text-neutral-400">AI Saathi can make mistakes. Consider verifying important information.</p>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
