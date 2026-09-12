import { createInertiaApp } from '@inertiajs/react';

const appName = import.meta.env.VITE_APP_NAME || 'AI Saathi';

void createInertiaApp({
    title: (title: string) => (title ? `${title} - ${appName}` : appName),
    progress: {
        color: '#4B5563',
    },
});
