// Client HTTP partagé : URLs depuis l'environnement + jeton JWT + flux 2FA & Reset Password.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost/api";
export const API_ORIGIN = new URL(API_URL).origin;
export const MERCURE_URL =
  process.env.NEXT_PUBLIC_MERCURE_URL ?? `${API_ORIGIN}/.well-known/mercure`;

const TOKEN_KEY = "visualpes_token";

export class UnauthorizedError extends Error {}

export interface LoginResult {
  twoFactorRequired: boolean;
  method?: "email" | "totp";
  challengeToken?: string;
  message?: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Rôles contenus dans le payload du JWT (lecture seule, aucune vérification de signature). */
export function getTokenRoles(): string[] {
  const token = getToken();
  if (!token) return [];
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return Array.isArray(payload.roles) ? payload.roles : [];
  } catch {
    return [];
  }
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new UnauthorizedError("Identifiants invalides");
  const data = (await res.json()) as {
    twoFactorRequired?: boolean;
    token?: string;
    method?: "email" | "totp";
    challengeToken?: string;
    message?: string;
  };

  if (data.twoFactorRequired) {
    return {
      twoFactorRequired: true,
      method: data.method ?? "email",
      challengeToken: data.challengeToken,
      message: data.message,
    };
  }

  if (!data.token) {
    throw new UnauthorizedError("Jeton manquant");
  }
  setToken(data.token);
  return { twoFactorRequired: false };
}

export async function verifyTwoFactorCode(
  challengeToken: string,
  code: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/auth/2fa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ challengeToken, code }),
  });
  const data = (await res.json()) as { token?: string; error?: string };
  if (!res.ok || !data.token) {
    throw new UnauthorizedError(
      data.error ?? "Code de vérification invalide ou expiré.",
    );
  }
  setToken(data.token);
}

export async function resendTwoFactorEmail(
  challengeToken: string,
): Promise<string> {
  const res = await fetch(`${API_URL}/auth/2fa/resend-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ challengeToken }),
  });
  const data = (await res.json()) as { message?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Impossible de renvoyer le code par e-mail.");
  }
  return data.message ?? "Code envoyé par e-mail.";
}

export async function requestPasswordReset(email: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = (await res.json()) as { message?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Erreur lors de la demande.");
  }
  return (
    data.message ??
    "Si un compte est rattaché à cet e-mail, un code de réinitialisation a été envoyé."
  );
}

export async function confirmPasswordReset(payload: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<string> {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { message?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Code invalide ou expiré.");
  }
  return data.message ?? "Mot de passe réinitialisé avec succès.";
}

/**
 * fetch authentifié. `path` est soit une IRI (`/api/orders/2`), soit une URL absolue.
 * Lève UnauthorizedError (et oublie le jeton) si l'API répond 401.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_ORIGIN}${path}`;
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/ld+json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { credentials: "include", ...init, headers });
  if (res.status === 401) {
    clearToken();
    throw new UnauthorizedError("Session expirée");
  }
  return res;
}
