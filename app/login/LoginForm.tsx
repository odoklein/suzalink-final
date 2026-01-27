"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { Zap } from "lucide-react";

export default function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Email ou mot de passe incorrect");
                setIsLoading(false);
                return;
            }

            // Fetch session to get role and redirect
            const response = await fetch("/api/auth/session");
            const session = await response.json();

            if (session?.user?.role) {
                const redirectPaths: Record<string, string> = {
                    SDR: "/sdr/action",
                    MANAGER: "/manager/dashboard",
                    CLIENT: "/client/portal",
                    DEVELOPER: "/developer/dashboard",
                    BUSINESS_DEVELOPER: "/bd/dashboard",
                };
                const redirectPath = redirectPaths[session.user.role] || "/";
                router.push(redirectPath);
            } else {
                router.push(callbackUrl);
            }
        } catch {
            setError("Une erreur est survenue");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-100/60 rounded-full blur-3xl" />
            </div>

            <Card variant="glass" className="w-full max-w-md relative z-10 shadow-xl shadow-slate-200/50">
                <CardContent>
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Suzalink</h1>
                            <p className="text-xs text-slate-500">Sales Execution Platform</p>
                        </div>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            id="email"
                            type="email"
                            label="Email"
                            placeholder="votre@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Input
                            id="password"
                            type="password"
                            label="Mot de passe"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full"
                            isLoading={isLoading}
                        >
                            Se connecter
                        </Button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-slate-500 text-xs mt-6">
                        Suzali Conseil © 2026
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}