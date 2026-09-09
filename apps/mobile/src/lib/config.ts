import Constants from "expo-constants";

type Extra = {
  apiUrl?: string;
  apiBonjourUrl?: string;
};

function extra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

function normalize(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function portFrom(url: string): string {
  try {
    return new URL(url).port || "3040";
  } catch {
    return "3040";
  }
}

export function defaultApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_PADELAPP_API_URL;
  const fromExtra = extra().apiUrl;
  return normalize(fromEnv ?? fromExtra ?? "http://127.0.0.1:3040");
}

let preferredBase: string | null = null;
let resolvedBase: string | null = null;

export function setPreferredApiBase(url: string): void {
  preferredBase = normalize(url);
}

export function apiCandidates(): string[] {
  const configured = defaultApiUrl();
  const rawBonjour = extra().apiBonjourUrl;
  const bonjour = rawBonjour ? normalize(rawBonjour) : "";
  const loopback = `http://127.0.0.1:${portFrom(configured)}`;
  return [...new Set([preferredBase, configured, bonjour, loopback].filter((url): url is string => Boolean(url)))];
}

export function apiBaseUrl(): string {
  return resolvedBase ?? preferredBase ?? defaultApiUrl();
}

export function setResolvedApiBase(url: string): void {
  resolvedBase = normalize(url);
}

export function resetApiBase(): void {
  resolvedBase = null;
}
