import type { AppRole, AppUser, Club, ClubSettings, Court } from "@padelapp/shared";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  fetchCourts,
  fetchMe,
  fetchSettings,
  loginRequest,
  logoutRequest,
  saveSettingsRequest,
} from "../lib/api";

const TOKEN_KEY = "padelapp.token";

export type SignedInSession = {
  token: string;
  user: AppUser;
  club: Club;
  courts: Court[];
  settings: ClubSettings | null;
};

type AuthState =
  | { status: "booting" }
  | { status: "signedOut" }
  | ({ status: "signedIn" } & SignedInSession);

type AuthContextValue = {
  state: AuthState;
  signIn: (input: { clubSlug: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCourts: () => Promise<void>;
  saveSettings: (settings: ClubSettings) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadSession(token: string): Promise<SignedInSession> {
  const [{ user, club }, courts, settings] = await Promise.all([
    fetchMe(token),
    fetchCourts(token),
    fetchSettings(token).catch(() => null),
  ]);
  return { token, user, club, courts, settings };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "booting" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        if (!cancelled) {
          setState({ status: "signedOut" });
        }
        return;
      }
      try {
        const session = await loadSession(token);
        if (!cancelled) {
          setState({ status: "signedIn", ...session });
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        if (!cancelled) {
          setState({ status: "signedOut" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (input: { clubSlug: string; email: string; password: string }) => {
      const logged = await loginRequest(input);
      const session = await loadSession(logged.token);
      await SecureStore.setItemAsync(TOKEN_KEY, logged.token);
      setState({ status: "signedIn", ...session });
    },
    [],
  );

  const signOut = useCallback(async () => {
    const token = state.status === "signedIn" ? state.token : null;
    if (token) {
      await logoutRequest(token);
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setState({ status: "signedOut" });
  }, [state]);

  const refreshCourts = useCallback(async () => {
    if (state.status !== "signedIn") {
      return;
    }
    const courts = await fetchCourts(state.token);
    setState((current) =>
      current.status === "signedIn" ? { ...current, courts } : current,
    );
  }, [state]);

  const saveSettings = useCallback(
    async (settings: ClubSettings) => {
      if (state.status !== "signedIn") {
        return;
      }
      const saved = await saveSettingsRequest(state.token, settings);
      setState((current) =>
        current.status === "signedIn"
          ? {
              ...current,
              settings: saved,
              club: { ...current.club, name: saved.branding.name },
            }
          : current,
      );
    },
    [state],
  );

  const value = useMemo(
    () => ({ state, signIn, signOut, refreshCourts, saveSettings }),
    [state, signIn, signOut, refreshCourts, saveSettings],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}

export function useSignedIn(): SignedInSession {
  const { state } = useAuth();
  if (state.status !== "signedIn") {
    throw new Error("useSignedIn requires a session");
  }
  return state;
}

export function roleHintKey(role: AppRole): "home.staffHint" | "home.coachHint" | "home.playerHint" {
  if (role === "player") {
    return "home.playerHint";
  }
  if (role === "coach") {
    return "home.coachHint";
  }
  return "home.staffHint";
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
