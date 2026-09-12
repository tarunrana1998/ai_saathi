export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth?: {
        user?: {
            id: number;
            name: string;
            email: string;
        };
    };
};
