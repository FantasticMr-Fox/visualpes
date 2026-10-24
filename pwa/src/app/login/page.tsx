"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login } from "@/lib/api";

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
      router.replace("/kanban");
    } catch {
      setError("Identifiants incorrects. Vérifiez votre email et votre mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-neutral-800/90 bg-neutral-900/70 p-7 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 font-mono text-sm font-black text-neutral-950">
            VA
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">VisuAlpes</h1>
            <p className="text-xs text-neutral-400">Connexion à l&apos;espace ERP & Atelier</p>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-300">
            Adresse email
            <input
              type="email"
              required
              autoComplete="username"
              placeholder="nom@visualpes.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-neutral-500"
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
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-neutral-500"
            />
          </label>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white py-2.5 text-xs font-semibold text-neutral-950 transition-colors hover:bg-neutral-200 disabled:opacity-50"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
