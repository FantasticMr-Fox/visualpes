// Client HTTP partagé : URLs depuis l'environnement + jeton JWT.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost/api";
export const API_ORIGIN = new URL(API_URL).origin;
export const MERCURE_URL =
  process.env.NEXT_PUBLIC_MERCURE_URL ?? `${API_ORIGIN}/.well-known/mercure`;

const TOKEN_KEY = "visualpes_token";

export class UnauthorizedError extends Error {}

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
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Array.isArray(payload.roles) ? payload.roles : [];
  } catch {
    return [];
  }
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_URL}/login_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new UnauthorizedError("Identifiants invalides");
  const data = await res.json();
  setToken(data.token);
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

