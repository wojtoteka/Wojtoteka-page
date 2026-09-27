import type { DefaultSession } from 'next-auth';
import type { Role } from '@/lib/auth/constants';

declare module 'next-auth' {
    interface User {
        role?: Role;
        accountId?: number;
        username?: string;
        apiKeyId?: number | null;
        ip?: string;
        ua?: string;
        sid?: string;
    }

    interface Session {
        user: {
            role?: Role;
            username: string;
            email: string;
        } & DefaultSession['user'];
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        role?: Role;
        accountId?: number;
        username?: string;
        email?: string | null;
        apiKeyId?: number | null;
        ip?: string;
        ua?: string;
        sid?: string;
        lastActivity?: number;
    }
}
