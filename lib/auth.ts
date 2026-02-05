import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";

// Extend NextAuth types
declare module "next-auth" {
    interface User {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        isActive: boolean;
        clientId?: string | null;
        clientOnboardingDismissedPermanently?: boolean;
    }
    interface Session {
        user: User;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: UserRole;
        isActive: boolean;
        clientId?: string | null;
        clientOnboardingDismissedPermanently?: boolean;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Mot de passe", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user) {
                    return null;
                }

                // Check if user is active (explicitly check for false to allow null/undefined)
                if (user.isActive === false) {
                    throw new Error("Votre compte a été désactivé. Contactez un administrateur.");
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    isActive: user.isActive ?? true, // Default to true for existing users
                    clientId: user.clientId,
                    clientOnboardingDismissedPermanently: user.clientOnboardingDismissedPermanently ?? false,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.isActive = user.isActive;
                token.clientId = user.clientId;
                token.clientOnboardingDismissedPermanently = user.clientOnboardingDismissedPermanently ?? false;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.isActive = token.isActive;
                session.user.clientId = token.clientId;
                // For CLIENT users, fetch fresh onboarding preference so update() reflects DB changes
                if (token.role === "CLIENT") {
                    const u = await prisma.user.findUnique({
                        where: { id: token.id },
                        select: { clientOnboardingDismissedPermanently: true },
                    });
                    session.user.clientOnboardingDismissedPermanently = u?.clientOnboardingDismissedPermanently ?? false;
                } else {
                    session.user.clientOnboardingDismissedPermanently = token.clientOnboardingDismissedPermanently ?? false;
                }
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
};

// Role-based redirect paths
export function getRedirectPath(role: UserRole): string {
    switch (role) {
        case "SDR":
            return "/sdr/action";
        case "MANAGER":
            return "/manager/dashboard";
        case "CLIENT":
            return "/client/portal";
        case "DEVELOPER":
            return "/developer/dashboard";
        case "BUSINESS_DEVELOPER":
            return "/bd/dashboard";
        default:
            return "/";
    }
}

// Role guard helper
export function isAuthorized(userRole: UserRole, allowedRoles: UserRole[]): boolean {
    return allowedRoles.includes(userRole);
}
