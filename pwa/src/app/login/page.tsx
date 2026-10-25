"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getTokenRoles, login } from "@/lib/api";
import { Button, Card, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const roles = getTokenRoles();
      router.replace(roles.includes("ROLE_ADMIN") ? "/kanban" : "/client");
    } catch {
      setError("Identifiants incorrects. Vérifiez votre email et votre mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
      <Card className="w-full max-w-sm bg-neutral-900/70 p-7 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 font-mono text-sm font-black text-neutral-950">
              VA
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">VisuAlpes</h1>
              <p className="text-xs text-neutral-400">
                Connexion Espace Client &amp; Atelier ERP
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-300">
              Adresse email
              <Input
                type="email"
                required
                autoComplete="username"
                placeholder="nom@visualpes.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="py-2.5"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-300">
              <div className="flex items-center justify-between">
                <span>Mot de passe</span>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[11px] font-normal text-neutral-400 hover:text-neutral-200"
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>
              <Input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="py-2.5"
              />
            </label>
          </div>

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full py-2.5">
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
