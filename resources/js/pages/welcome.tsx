import { Head } from '@inertiajs/react';
import {
    Activity,
    Bot,
    Check,
    ChevronRight,
    Code2,
    Copy,
    Cpu,
    Gauge,
    Layers,
    Menu,
    Orbit,
    Plus,
    Radio,
    Send,
    Shield,
    Sparkles,
    Terminal,
    Trash2,
    User,
    Wifi,
    X,
    Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

interface TokenUsage {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    reasoning_tokens?: number;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    usage?: TokenUsage | null;
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

    // Calculate total conversation tokens
    const totalSessionTokens = useMemo(() => {
        return messages.reduce((acc, msg) => {
            const prompt = msg.usage?.prompt_tokens ?? 0;
            const completion = msg.usage?.completion_tokens ?? 0;
            const total = msg.usage?.total_tokens ?? (prompt + completion);
            return acc + total;
        }, 0);
    }, [messages]);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Fetch conversation logs
    const fetchConversations = async () => {
        try {
            const res = await fetch('/api/conversations');
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (e) {
            console.error('Failed to load memory modules', e);
        }
    };

    useEffect(() => {
        void fetchConversations();
    }, []);

    // Select conversation
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
            console.error('Failed to fetch neural logs', e);
        } finally {
            setIsLoading(false);
        }
    };

    // Reset / New Session
    const handleNewChat = () => {
        setActiveConversationId(null);
        setMessages([]);
        setInput('');
        setSidebarOpen(false);
        textareaRef.current?.focus();
    };

    // Purge conversation
    const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setConversations((prev) => prev.filter((c) => c.id !== id));
                if (activeConversationId === id) {
                    handleNewChat();
                }
            }
        } catch (e) {
            console.error('Failed to purge memory block', e);
        }
    };

    // Send payload to backend
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
                throw new Error(`Neural link status ${res.status}`);
            }

            const data = await res.json();

            if (!activeConversationId && data.conversation_id) {
                setActiveConversationId(data.conversation_id);
            }

            if (data.message) {
                setMessages((prev) => [...prev, data.message]);
            }

            void fetchConversations();
        } catch (err: unknown) {
            const errorMsg: Message = {
                id: `err-${Date.now()}`,
                role: 'assistant',
                content: err instanceof Error ? `[TRANSMISSION ERROR]: ${err.message}` : '[ERROR]: Neural connection lost.',
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text: string, index: number) => {
        void navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const roboticProtocols = [
        {
            icon: Code2,
            tag: 'SYNTHESIS // 01',
            title: 'Generate Backend Middleware',
            prompt: 'Write an optimized Laravel 12 middleware for API rate limiting with detailed docstrings.',
            color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
        },
        {
            icon: Cpu,
            tag: 'NEURAL CORE // 02',
            title: 'Explain Quantum Algorithms',
            prompt: 'Explain Shor’s quantum factoring algorithm and its implications for modern cryptography in a concise, technical breakdown.',
            color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
        },
        {
            icon: Terminal,
            tag: 'CYBER DIAGNOSTICS // 03',
            title: 'Debug React Performance',
            prompt: 'What are the best strategies to diagnose and prevent unnecessary re-renders in complex React 19 component trees?',
            color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30',
        },
        {
            icon: Sparkles,
            tag: 'CREATIVE MATRIX // 04',
            title: 'Cyberpunk Story Concept',
            prompt: 'Generate an atmospheric lore backstory for a sentient cybernetic companion wandering Neo-Tokyo.',
            color: 'from-amber-500/20 to-rose-500/20 text-amber-400 border-amber-500/30',
        },
    ];

    return (
        <>
            <Head title="AI SAATHI // ROBOTICS NEURAL CO-PILOT" />

            <div className="flex h-screen w-full overflow-hidden bg-[#0a0d14] font-sans text-neutral-100 antialiased selection:bg-cyan-500 selection:text-black">
                {/* Background Tech Grid & Ambient Glows */}
                <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
                <div className="pointer-events-none fixed inset-0 z-0 opacity-20 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem]" />

                {/* Mobile Backdrop */}
                {sidebarOpen && (
                    <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md md:hidden" />
                )}

                {/* Left Robotics Sidebar */}
                <aside
                    className={`fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r border-cyan-900/40 bg-[#0d121f]/95 backdrop-blur-xl transition-all duration-300 md:static md:translate-x-0 ${
                        sidebarOpen ? 'translate-x-0 shadow-2xl shadow-cyan-500/10' : '-translate-x-full'
                    }`}
                >
                    {/* Sidebar HUD Header */}
                    <div className="relative border-b border-cyan-900/40 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/40">
                                    <Bot className="size-5 animate-pulse" />
                                    <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-[#0a0d14]" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-sm font-bold tracking-widest text-cyan-300">AI SAATHI</span>
                                        <span className="rounded-xs bg-cyan-950/80 px-1.5 py-0.5 font-mono text-[9px] text-cyan-400 border border-cyan-800/50">
                                            v2.4
                                        </span>
                                    </div>
                                    <p className="font-mono text-[10px] text-neutral-400 flex items-center gap-1">
                                        <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
                                        NEURAL INTERFACE // ACTIVE
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(false)}
                                className="rounded-lg p-1.5 text-neutral-400 hover:bg-cyan-950/50 hover:text-cyan-300 md:hidden"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                    </div>

                    {/* New Session Trigger */}
                    <div className="p-3">
                        <button
                            type="button"
                            onClick={handleNewChat}
                            className="group relative flex w-full items-center justify-between overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 to-blue-950/40 p-3 text-xs font-semibold text-cyan-300 shadow-sm transition-all hover:border-cyan-400 hover:bg-cyan-900/30 hover:shadow-cyan-500/20 hover:shadow-md"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                                    <Plus className="size-3.5" />
                                </div>
                                <span className="tracking-wider uppercase font-mono">INITIATE NEW LOG</span>
                            </div>
                            <span className="font-mono text-[10px] text-cyan-500/60 group-hover:text-cyan-400">⌘ + N</span>
                        </button>
                    </div>

                    {/* Mission Logs / Memory Blocks */}
                    <div className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-cyan-900/40">
                        <div className="flex items-center justify-between px-2 pb-2 text-[10px] font-mono tracking-widest text-cyan-500/70 uppercase">
                            <span className="flex items-center gap-1">
                                <Layers className="size-3" /> MEMORY ARCHIVE
                            </span>
                            <span>{conversations.length} BLOCKS</span>
                        </div>

                        {conversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-cyan-950/80 p-8 text-center text-xs font-mono text-neutral-500">
                                <Radio className="size-5 mb-2 text-cyan-500/40 animate-pulse" />
                                <span>No memory modules recorded.</span>
                            </div>
                        ) : (
                            conversations.map((conv) => {
                                const isActive = activeConversationId === conv.id;
                                return (
                                    <div
                                        key={conv.id}
                                        onClick={() => void selectConversation(conv.id)}
                                        className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-mono cursor-pointer transition-all border ${
                                            isActive
                                                ? 'border-cyan-500/50 bg-cyan-950/60 text-cyan-200 shadow-inner shadow-cyan-500/10'
                                                : 'border-transparent text-neutral-400 hover:border-cyan-900/40 hover:bg-neutral-900/60 hover:text-neutral-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 truncate pr-6">
                                            <div
                                                className={`size-1.5 rounded-full ${
                                                    isActive ? 'bg-cyan-400 shadow-xs shadow-cyan-400' : 'bg-neutral-600'
                                                }`}
                                            />
                                            <span className="truncate">{conv.title || 'LOG_ENTRY_UNNAMED'}</span>
                                        </div>

                                        <button
                                            type="button"
                                            title="Purge Memory"
                                            onClick={(e) => void handleDeleteConversation(e, conv.id)}
                                            className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-neutral-500 hover:bg-red-950/60 hover:text-red-400 hover:border hover:border-red-500/30 transition-all"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Sidebar Telemetry & Token Stats Footer */}
                    <div className="border-t border-cyan-900/40 p-4 bg-[#0a0e1a]/90 font-mono text-[11px] space-y-2.5">
                        {/* Token Consumption Telemetry Meter */}
                        <div className="rounded-xl border border-cyan-900/50 bg-cyan-950/30 p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between text-neutral-400 text-[10px]">
                                <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                                    <Zap className="size-3" /> TOKEN MONITOR
                                </span>
                                <span className="font-bold text-cyan-300">{totalSessionTokens.toLocaleString()} TOTAL</span>
                            </div>
                            <div className="w-full bg-cyan-950/80 rounded-full h-1.5 overflow-hidden border border-cyan-800/40">
                                <div
                                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, Math.max(5, (totalSessionTokens / 2000) * 100))}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-neutral-400 text-[10px]">
                            <span className="flex items-center gap-1.5">
                                <Cpu className="size-3 text-cyan-400" />
                                <span>MODEL</span>
                            </span>
                            <span className="text-cyan-300 font-semibold">GEMINI 3.6 FLASH</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-neutral-500">
                            <span className="flex items-center gap-1">
                                <Wifi className="size-3 text-emerald-400" /> SYNC: PERSISTENT
                            </span>
                            <span className="text-emerald-400">99.9% ONLINE</span>
                        </div>
                    </div>
                </aside>

                {/* Main Robotic Cockpit View */}
                <main className="relative z-10 flex flex-1 flex-col h-full overflow-hidden bg-transparent">
                    {/* Top Cyber Telemetry Header */}
                    <header className="flex h-16 shrink-0 items-center justify-between border-b border-cyan-900/40 bg-[#0c101c]/80 px-4 md:px-6 backdrop-blur-lg">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                className="rounded-xl border border-cyan-900/60 bg-cyan-950/30 p-2 text-cyan-400 hover:bg-cyan-900/40 md:hidden"
                                title="Toggle Telemetry"
                            >
                                <Menu className="size-5" />
                            </button>

                            <div className="flex items-center gap-2.5">
                                <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                                    <Orbit className="size-4 animate-spin [animation-duration:8s]" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm font-bold tracking-wider text-neutral-100">
                                            AI SAATHI ROBOTICS
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-950/80 px-2 py-0.5 font-mono text-[10px] font-medium text-cyan-400 border border-cyan-500/30">
                                            <Activity className="size-2.5 animate-pulse text-emerald-400" />
                                            NEURAL CO-PILOT
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Live Session Token Badge in Header */}
                            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-cyan-900/50 bg-[#0f172a]/80 px-3 py-1.5 font-mono text-xs text-neutral-300">
                                <Gauge className="size-3.5 text-cyan-400" />
                                <span className="text-neutral-400 text-[10px]">SESSION TOKENS:</span>
                                <span className="text-cyan-300 font-bold">{totalSessionTokens.toLocaleString()}</span>
                            </div>

                            <button
                                type="button"
                                onClick={handleNewChat}
                                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all shadow-sm shadow-cyan-500/10"
                            >
                                <Plus className="size-3.5" />
                                <span className="hidden sm:inline uppercase">NEW SESSION</span>
                            </button>
                        </div>
                    </header>

                    {/* Messages Flow Container */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 scrollbar-thin scrollbar-thumb-cyan-900/30">
                        <div className="mx-auto max-w-4xl space-y-6">
                            {messages.length === 0 ? (
                                /* Futuristic Hero & Core Animation */
                                <div className="flex min-h-[65vh] flex-col items-center justify-center text-center space-y-8 py-6">
                                    {/* Animated Robotic Iris */}
                                    <div className="relative flex size-24 items-center justify-center">
                                        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
                                        <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-spin [animation-duration:12s]" />
                                        <div className="absolute inset-2 rounded-full border border-dashed border-blue-400/40 animate-spin [animation-duration:7s] [animation-direction:reverse]" />
                                        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#0f172a] to-cyan-950 border border-cyan-400/50 shadow-lg shadow-cyan-500/30">
                                            <Bot className="size-8 text-cyan-300" />
                                        </div>
                                    </div>

                                    <div className="space-y-2.5 max-w-xl">
                                        <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/50 px-3 py-1 font-mono text-[11px] text-cyan-300">
                                            <Zap className="size-3 text-cyan-400" />
                                            <span>AUTONOMOUS REASONING CORE // READY</span>
                                        </div>
                                        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                                            Welcome, Operator.
                                        </h1>
                                        <p className="text-sm font-mono text-neutral-400 leading-relaxed">
                                            AI Saathi is ready to process complex queries, generate code architectures, track real-time token metrics, and retain context across sessions.
                                        </p>
                                    </div>

                                    {/* Robotic Protocol Starter Cards */}
                                    <div className="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2 text-left">
                                        {roboticProtocols.map((item, i) => {
                                            const Icon = item.icon;
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => {
                                                        setInput(item.prompt);
                                                        textareaRef.current?.focus();
                                                    }}
                                                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-4.5 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${item.color} bg-[#0e1322]/80 backdrop-blur-md`}
                                                >
                                                    <div className="flex items-center justify-between w-full mb-3">
                                                        <span className="font-mono text-[10px] tracking-widest uppercase opacity-75">
                                                            {item.tag}
                                                        </span>
                                                        <div className="rounded-lg bg-white/5 p-1.5 group-hover:bg-white/10 transition-colors">
                                                            <Icon className="size-4" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-neutral-100 group-hover:text-cyan-300 transition-colors">
                                                            {item.title}
                                                        </h3>
                                                        <p className="mt-1 text-xs font-mono text-neutral-400 line-clamp-2">
                                                            {item.prompt}
                                                        </p>
                                                    </div>
                                                    <div className="mt-3 flex items-center gap-1 font-mono text-[10px] opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                                        <span>EXECUTE PROTOCOL</span>
                                                        <ChevronRight className="size-3" />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                /* Holographic Robotic Message Stream */
                                messages.map((msg, idx) => {
                                    const isUser = msg.role === 'user';
                                    const promptTokens = msg.usage?.prompt_tokens ?? 0;
                                    const completionTokens = msg.usage?.completion_tokens ?? 0;
                                    const totalTokens = msg.usage?.total_tokens ?? (promptTokens + completionTokens);

                                    return (
                                        <div
                                            key={msg.id || idx}
                                            className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {!isUser && (
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 border border-cyan-400/50 text-white shadow-md shadow-cyan-500/20">
                                                    <Bot className="size-4" />
                                                </div>
                                            )}

                                            <div
                                                className={`relative max-w-[85%] rounded-2xl p-4.5 text-sm leading-relaxed backdrop-blur-md transition-all ${
                                                    isUser
                                                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20 rounded-tr-xs border border-cyan-400/30'
                                                        : 'bg-[#111728]/90 text-neutral-200 rounded-tl-xs border border-cyan-900/50 shadow-md'
                                                }`}
                                            >
                                                {/* Header label for each message */}
                                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 font-mono text-[10px]">
                                                    <span className={isUser ? 'text-cyan-100' : 'text-cyan-400'}>
                                                        {isUser ? 'OPERATOR // INPUT' : 'AI SAATHI // NEURAL RESPONSE'}
                                                    </span>
                                                    {msg.created_at && (
                                                        <span className="text-white/40">
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed">
                                                    {msg.content}
                                                </div>

                                                {/* Assistant Footer with Real-Time Token Telemetry */}
                                                {!isUser && (
                                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-cyan-900/30 font-mono text-[10px]">
                                                        {/* Token Stats Badge */}
                                                        {totalTokens > 0 ? (
                                                            <div className="flex items-center gap-1.5 rounded-md bg-cyan-950/60 px-2 py-0.5 border border-cyan-800/40 text-cyan-300">
                                                                <Zap className="size-3 text-cyan-400" />
                                                                <span>
                                                                    <strong className="text-cyan-200">{totalTokens} TOKENS</strong> (IN: {promptTokens} | OUT: {completionTokens})
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-cyan-500/70">
                                                                <Check className="size-3" /> VERIFIED OUTPUT
                                                            </span>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopy(msg.content, idx)}
                                                            className="flex items-center gap-1 rounded-md px-2 py-1 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 transition-colors border border-cyan-800/40 ml-auto"
                                                        >
                                                            {copiedIndex === idx ? (
                                                                <>
                                                                    <Check className="size-3 text-emerald-400" />
                                                                    <span className="text-emerald-400">COPIED</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="size-3" />
                                                                    <span>COPY PAYLOAD</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {isUser && (
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300">
                                                    <User className="size-4" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}

                            {/* Futuristic Thinking / Synthesizing Indicator */}
                            {isLoading && (
                                <div className="flex items-center gap-3.5">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-cyan-600/30 border border-cyan-400/50 text-cyan-300">
                                        <Bot className="size-4 animate-spin" />
                                    </div>
                                    <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-cyan-500/40 bg-[#111728]/90 px-4 py-3 font-mono text-xs text-cyan-300">
                                        <div className="flex gap-1.5">
                                            <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
                                            <span className="size-1.5 rounded-full bg-cyan-400 animate-ping [animation-delay:0.2s]" />
                                            <span className="size-1.5 rounded-full bg-cyan-400 animate-ping [animation-delay:0.4s]" />
                                        </div>
                                        <span className="tracking-wider">SYNTHESIZING NEURAL OUTPUT & MEASURING TOKENS...</span>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Bottom Futuristic Command Console */}
                    <div className="shrink-0 border-t border-cyan-900/40 bg-[#090d18]/90 p-4 backdrop-blur-xl">
                        <div className="mx-auto max-w-4xl space-y-2">
                            <form
                                onSubmit={(e) => void handleSubmit(e)}
                                className="relative flex items-center rounded-2xl border border-cyan-500/40 bg-[#0f172a]/90 p-2 pl-4 shadow-xl shadow-cyan-950/50 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/60 transition-all"
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
                                    placeholder="Enter command or query for AI Saathi... (Press Enter to transmit)"
                                    rows={1}
                                    className="max-h-32 flex-1 resize-none bg-transparent font-sans text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none scrollbar-none"
                                    style={{ minHeight: '26px', height: 'auto' }}
                                />

                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="ml-2 flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold shadow-md shadow-cyan-500/30 transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                                    title="Transmit to AI Saathi"
                                >
                                    <Send className="size-4.5" />
                                </button>
                            </form>

                            <div className="flex items-center justify-between px-2 font-mono text-[10px] text-neutral-500">
                                <span className="flex items-center gap-1">
                                    <Terminal className="size-3 text-cyan-500" />
                                    <span>AI SAATHI NEURAL CO-PILOT</span>
                                </span>
                                <span>LATENCY: ~32ms // GEMINI 3.6 FLASH</span>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
