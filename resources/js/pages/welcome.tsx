import { Head } from '@inertiajs/react';
import {
    Activity,
    Bot,
    Check,
    ChevronRight,
    Clock,
    Code2,
    Copy,
    Cpu,
    FileCode,
    FileText,
    Gauge,
    Image as ImageIcon,
    Layers,
    Menu,
    Orbit,
    Paperclip,
    Plus,
    Radio,
    RefreshCw,
    Send,
    Shield,
    Sparkles,
    Terminal,
    Timer,
    Trash2,
    UploadCloud,
    User,
    Wifi,
    X,
    Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface TokenUsage {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    reasoning_tokens?: number;
}

interface QuotaStats {
    limit: number;
    used: number;
    remaining: number;
    percentage: number;
    rpm_limit?: number;
    rpm_used?: number;
    rpm_remaining?: number;
    rpd_limit?: number;
    rpd_used?: number;
    rpd_remaining?: number;
    reset_in_seconds: number;
    window_seconds: number;
}

interface MessageAttachment {
    name?: string;
    url?: string;
    mime_type?: string;
    size?: string | number;
    is_image?: boolean;
}

interface FileAttachment {
    file: File;
    previewUrl?: string;
    isImage: boolean;
    name: string;
    sizeFormatted: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    attachments?: MessageAttachment[] | null;
    usage?: TokenUsage | null;
    created_at?: string;
}

interface Conversation {
    id: string;
    title: string;
    created_at?: string;
    updated_at?: string;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CodeBlock({ language, value }: { language: string; value: string }) {
    const [copied, setCopied] = useState(false);

    const onCopy = () => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative my-3.5 rounded-xl border border-cyan-900/60 bg-[#080d19] overflow-hidden shadow-2xl">
            {/* Code Block HUD Header */}
            <div className="flex items-center justify-between border-b border-cyan-950/90 bg-[#060913] px-3.5 py-1.5 font-mono text-[11px] text-cyan-400">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        <span className="size-2 rounded-full bg-red-500/80" />
                        <span className="size-2 rounded-full bg-yellow-500/80" />
                        <span className="size-2 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 ml-1">
                        {language || 'code'}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onCopy}
                    className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] text-neutral-400 hover:bg-cyan-950/70 hover:text-cyan-300 transition-colors border border-transparent hover:border-cyan-800/40"
                >
                    {copied ? (
                        <>
                            <Check className="size-3 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">COPIED</span>
                        </>
                    ) : (
                        <>
                            <Copy className="size-3" />
                            <span>COPY CODE</span>
                        </>
                    )}
                </button>
            </div>

            {/* Syntax Highlighted Code Body */}
            <div className="overflow-x-auto text-[13px] font-mono leading-relaxed p-1">
                <SyntaxHighlighter
                    language={language || 'javascript'}
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        padding: '1rem',
                        background: 'transparent',
                        fontSize: '13px',
                        lineHeight: '1.6',
                    }}
                    wrapLongLines={true}
                >
                    {value}
                </SyntaxHighlighter>
            </div>
        </div>
    );
}

export default function Welcome() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    // Live Quota & Countdown State
    const [quota, setQuota] = useState<QuotaStats | null>(null);
    const [countdownSeconds, setCountdownSeconds] = useState<number>(60);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Fetch quota from backend
    const fetchQuota = async () => {
        try {
            const res = await fetch('/api/quota');
            if (res.ok) {
                const data: QuotaStats = await res.json();
                setQuota(data);
                setCountdownSeconds(data.reset_in_seconds);
            }
        } catch (e) {
            console.error('Failed to fetch quota metrics', e);
        }
    };

    // Countdown Timer Ticker
    useEffect(() => {
        void fetchQuota();

        const timer = setInterval(() => {
            setCountdownSeconds((prev) => {
                if (prev <= 1) {
                    void fetchQuota();
                    return 60;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

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

    // File Selection Handlers
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const newFiles: FileAttachment[] = Array.from(e.target.files).map((f) => {
            const isImage = f.type.startsWith('image/');
            return {
                file: f,
                previewUrl: isImage ? URL.createObjectURL(f) : undefined,
                isImage,
                name: f.name,
                sizeFormatted: formatBytes(f.size),
            };
        });
        setAttachments((prev) => [...prev, ...newFiles]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments((prev) => {
            const removed = prev[index];
            if (removed?.previewUrl) {
                URL.revokeObjectURL(removed.previewUrl);
            }
            return prev.filter((_, i) => i !== index);
        });
    };

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
        setAttachments([]);
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
        if ((!trimmed && attachments.length === 0) || isLoading) return;

        const currentAttachments = [...attachments];
        const userMsg: Message = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: trimmed || (currentAttachments.length > 0 ? `[Attached ${currentAttachments.length} file(s)]` : ''),
            attachments: currentAttachments.map((a) => ({
                name: a.name,
                url: a.previewUrl,
                is_image: a.isImage,
                size: a.sizeFormatted,
            })),
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setAttachments([]);
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('message', trimmed || 'Please analyze and inspect the attached file(s).');
            if (activeConversationId) {
                formData.append('conversation_id', activeConversationId);
            }
            currentAttachments.forEach((a) => {
                formData.append('files[]', a.file);
            });

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                },
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                const errorDetail = data.error || data.message || `Neural link status ${res.status}`;
                throw new Error(errorDetail);
            }

            if (!activeConversationId && data.conversation_id) {
                setActiveConversationId(data.conversation_id);
            }

            if (data.message) {
                setMessages((prev) => [...prev, data.message]);
            }

            // Sync quota from response
            if (data.quota) {
                setQuota(data.quota);
                setCountdownSeconds(data.quota.reset_in_seconds);
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

    const formatCountdown = (secs: number) => {
        const s = Math.max(0, secs);
        const mins = Math.floor(s / 60);
        const remSecs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}s`;
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

                    {/* Sidebar Telemetry, Live Quota & Token Meter */}
                    <div className="border-t border-cyan-900/40 p-4 bg-[#0a0e1a]/95 font-mono text-[11px] space-y-3">
                        {/* Live Quota Remaining Card */}
                        <div className="rounded-xl border border-cyan-800/50 bg-cyan-950/40 p-3 space-y-2.5">
                            <div className="flex items-center justify-between text-neutral-400 text-[10px]">
                                <span className="flex items-center gap-1.5 text-cyan-400 font-bold tracking-wider">
                                    <Zap className="size-3 text-cyan-300" /> QUOTA TELEMETRY
                                </span>
                                <span className="font-bold text-emerald-400">
                                    {quota ? `${(quota.remaining / 1000).toFixed(1)}K TPM` : '250K TPM'}
                                </span>
                            </div>

                            {/* Triple Metrics Breakdown: RPM, TPM, RPD */}
                            <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px]">
                                <div className="rounded-lg bg-black/40 p-1.5 border border-cyan-900/40 text-center">
                                    <div className="text-neutral-500 text-[9px]">RPM</div>
                                    <div className="font-bold text-cyan-300">
                                        {quota?.rpm_used ?? 0} / {quota?.rpm_limit ?? 5}
                                    </div>
                                </div>
                                <div className="rounded-lg bg-black/40 p-1.5 border border-cyan-900/40 text-center">
                                    <div className="text-neutral-500 text-[9px]">TPM</div>
                                    <div className="font-bold text-emerald-400">
                                        {quota ? `${(quota.used / 1000).toFixed(1)}K` : '0K'}
                                    </div>
                                </div>
                                <div className="rounded-lg bg-black/40 p-1.5 border border-cyan-900/40 text-center">
                                    <div className="text-neutral-500 text-[9px]">RPD</div>
                                    <div className="font-bold text-amber-400">
                                        {quota?.rpd_used ?? 0} / {quota?.rpd_limit ?? 20}
                                    </div>
                                </div>
                            </div>

                            {/* Remaining Percentage Bar */}
                            <div className="w-full bg-[#070b14] rounded-full h-1.5 overflow-hidden border border-cyan-900/60">
                                <div
                                    className="bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${quota?.percentage ?? 100}%` }}
                                />
                            </div>

                            {/* Reset Countdown Readout */}
                            <div className="flex items-center justify-between pt-1 border-t border-cyan-900/30 text-[10px] text-neutral-400">
                                <span className="flex items-center gap-1">
                                    <Timer className="size-3 text-cyan-400" /> RESETS IN:
                                </span>
                                <span className="font-bold text-cyan-300 tracking-wider">
                                    {formatCountdown(countdownSeconds)}
                                </span>
                            </div>
                        </div>

                        {/* Model & Network Info */}
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
                    {/* Top Cyber Telemetry Header with Live Token Remaining & Countdown */}
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

                        {/* Top Telemetry Meters: RPM, TPM, RPD & Reset Timer */}
                        <div className="flex items-center gap-2 font-mono text-xs">
                            {/* RPM Gauge */}
                            <div className="hidden lg:flex items-center gap-1.5 rounded-xl border border-cyan-900/60 bg-[#0f172a]/80 px-2.5 py-1.5 text-neutral-300">
                                <Activity className="size-3 text-cyan-400" />
                                <span className="text-neutral-500 text-[10px]">RPM:</span>
                                <span className="text-cyan-300 font-bold">
                                    {quota?.rpm_used ?? 0}/{quota?.rpm_limit ?? 5}
                                </span>
                            </div>

                            {/* TPM Gauge */}
                            <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-cyan-900/60 bg-[#0f172a]/80 px-2.5 py-1.5 text-neutral-300">
                                <Gauge className="size-3.5 text-emerald-400" />
                                <span className="text-neutral-500 text-[10px]">TPM:</span>
                                <span className="text-emerald-400 font-bold">
                                    {quota ? `${(quota.remaining / 1000).toFixed(0)}K` : '250K'} REM
                                </span>
                            </div>

                            {/* RPD Gauge */}
                            <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-cyan-900/60 bg-[#0f172a]/80 px-2.5 py-1.5 text-neutral-300">
                                <span className="text-neutral-500 text-[10px]">RPD:</span>
                                <span className="text-amber-400 font-bold">
                                    {quota?.rpd_used ?? 0}/{quota?.rpd_limit ?? 20}
                                </span>
                            </div>

                            {/* Reset Countdown Meter */}
                            <div className="flex items-center gap-1.5 rounded-xl border border-cyan-900/60 bg-[#0f172a]/80 px-2.5 py-1.5 text-neutral-300">
                                <Clock className="size-3 text-cyan-400 animate-spin [animation-duration:15s]" />
                                <span className="text-neutral-500 text-[10px] hidden sm:inline">RESET:</span>
                                <span className="text-cyan-300 font-bold tracking-wider">
                                    {formatCountdown(countdownSeconds)}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handleNewChat}
                                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all shadow-sm shadow-cyan-500/10"
                            >
                                <Plus className="size-3.5" />
                                <span className="hidden sm:inline uppercase">NEW</span>
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
                                /* Holographic Robotic Message Stream with Full Syntax-Highlighted Markdown */
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

                                                {/* User Attachments if any */}
                                                {isUser && msg.attachments && msg.attachments.length > 0 && (
                                                    <div className="mb-2.5 flex flex-wrap gap-2">
                                                        {msg.attachments.map((att, aIdx) =>
                                                            att.is_image && att.url ? (
                                                                <div key={aIdx} className="overflow-hidden rounded-lg border border-cyan-400/40 bg-black/40 shadow">
                                                                    <img src={att.url} alt={att.name || 'Attachment'} className="max-h-48 max-w-xs object-cover rounded" />
                                                                    {att.name && <div className="p-1 font-mono text-[9px] text-cyan-200 truncate max-w-xs">{att.name}</div>}
                                                                </div>
                                                            ) : (
                                                                <div key={aIdx} className="flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-black/40 px-2.5 py-1.5 font-mono text-[11px] text-cyan-200">
                                                                    <FileText className="size-3.5 text-cyan-300" />
                                                                    <span className="truncate max-w-[180px]">{att.name || 'Attached File'}</span>
                                                                    {att.size && <span className="text-[9px] text-white/50">({String(att.size)})</span>}
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                )}

                                                {/* Formatted Markdown Content with Syntax Highlighting */}
                                                <div className="font-sans text-[13.5px] leading-relaxed">
                                                    {isUser ? (
                                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                                    ) : (
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                h1: ({ children }) => <h1 className="text-lg font-bold text-white mb-2 mt-3">{children}</h1>,
                                                                h2: ({ children }) => <h2 className="text-base font-bold text-cyan-200 mb-2 mt-2.5">{children}</h2>,
                                                                h3: ({ children }) => <h3 className="text-sm font-semibold text-cyan-300 mb-1 mt-2">{children}</h3>,
                                                                p: ({ children }) => <p className="mb-2.5 leading-relaxed text-neutral-200 last:mb-0">{children}</p>,
                                                                ul: ({ children }) => <ul className="list-disc list-inside mb-2.5 space-y-1 text-neutral-200">{children}</ul>,
                                                                ol: ({ children }) => <ol className="list-decimal list-inside mb-2.5 space-y-1 text-neutral-200">{children}</ol>,
                                                                li: ({ children }) => <li className="text-neutral-200">{children}</li>,
                                                                blockquote: ({ children }) => <blockquote className="border-l-2 border-cyan-400 pl-3 italic text-neutral-400 my-2">{children}</blockquote>,
                                                                code({ className, children, ...props }) {
                                                                    const match = /language-(\w+)/.exec(className || '');
                                                                    const codeString = String(children).replace(/\n$/, '');
                                                                    const isInline = !match && !String(children).includes('\n');

                                                                    if (isInline) {
                                                                        return (
                                                                            <code className="rounded-md bg-cyan-950/80 border border-cyan-800/50 px-1.5 py-0.5 font-mono text-[12px] text-cyan-300" {...props}>
                                                                                {children}
                                                                            </code>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <CodeBlock
                                                                            language={match ? match[1] : ''}
                                                                            value={codeString}
                                                                        />
                                                                    );
                                                                },
                                                                table: ({ children }) => (
                                                                    <div className="my-3 overflow-x-auto rounded-lg border border-cyan-900/50">
                                                                        <table className="w-full text-left text-xs">{children}</table>
                                                                    </div>
                                                                ),
                                                                th: ({ children }) => <th className="border-b border-cyan-900/60 bg-cyan-950/60 p-2 font-mono font-semibold text-cyan-300">{children}</th>,
                                                                td: ({ children }) => <td className="border-b border-cyan-900/30 p-2 text-neutral-300">{children}</td>,
                                                                a: ({ href, children }) => (
                                                                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                                                                        {children}
                                                                    </a>
                                                                ),
                                                            }}
                                                        >
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    )}
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
                            {/* Staged Attachments Preview Dock */}
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-900/60 bg-[#0c1222]/90 p-2.5 backdrop-blur-md">
                                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-cyan-400 mr-1">
                                        <UploadCloud className="size-3.5 text-cyan-400" />
                                        <span>STAGED PAYLOADS ({attachments.length}):</span>
                                    </div>
                                    {attachments.map((att, idx) => (
                                        <div
                                            key={idx}
                                            className="group relative flex items-center gap-2 rounded-lg border border-cyan-700/50 bg-cyan-950/70 py-1 pl-2 pr-1.5 text-xs font-mono text-cyan-200 shadow"
                                        >
                                            {att.isImage && att.previewUrl ? (
                                                <img src={att.previewUrl} alt={att.name} className="size-5 rounded object-cover border border-cyan-500/40" />
                                            ) : (
                                                <FileCode className="size-4 text-cyan-400" />
                                            )}
                                            <span className="max-w-[140px] truncate text-[11px] font-medium">{att.name}</span>
                                            <span className="text-[9px] text-cyan-400/60">({att.sizeFormatted})</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment(idx)}
                                                className="rounded p-0.5 text-cyan-400/70 hover:bg-cyan-800/60 hover:text-white transition-colors"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Hidden File Input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="image/*,.pdf,.txt,.md,.json,.csv,.js,.ts,.py,.php,.html,.css"
                            />

                            <form
                                onSubmit={(e) => void handleSubmit(e)}
                                className="relative flex items-center rounded-2xl border border-cyan-500/40 bg-[#0f172a]/90 p-2 pl-3 shadow-xl shadow-cyan-950/50 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/60 transition-all"
                            >
                                {/* Paperclip Attachment Trigger Button */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading}
                                    className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-lg border border-cyan-800/60 bg-cyan-950/50 text-cyan-400 transition-all hover:bg-cyan-900/70 hover:text-cyan-200 hover:border-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Attach documents or images"
                                >
                                    <Paperclip className="size-4" />
                                </button>

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
                                    placeholder={attachments.length > 0 ? "Add instructions for attached file(s)... (Press Enter to transmit)" : "Enter command or query for AI Saathi... (Press Enter to transmit)"}
                                    rows={1}
                                    className="max-h-32 flex-1 resize-none bg-transparent font-sans text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none scrollbar-none"
                                    style={{ minHeight: '26px', height: 'auto' }}
                                />

                                <button
                                    type="submit"
                                    disabled={(!input.trim() && attachments.length === 0) || isLoading}
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
                                <span>LATENCY: ~32ms // GEMINI 3.6 FLASH // MULTIMODAL ENABLED</span>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
