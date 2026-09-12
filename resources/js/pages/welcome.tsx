import { Head } from '@inertiajs/react';

export default function Welcome() {
    return (
        <>
            <Head title="Welcome" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-neutral-900">
                <main className="flex flex-col items-center gap-4 text-center">
                    <h1 className="text-4xl font-bold tracking-tight">AI Saathi</h1>
                    <p className="text-lg text-neutral-600">
                        Hello from AI saathi
                    </p>
                </main>
            </div>
        </>
    );
}
