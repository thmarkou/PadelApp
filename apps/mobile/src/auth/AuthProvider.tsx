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
  registerRequest,
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

type Credentials = { clubSlug: string; email: string; password: string };
type RegisterInput = Credentials & { displayName: string };

type AuthContextValue = {
  state: AuthState;
  signIn: (input: Credentials) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
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

  const applyToken = useCallback(async (token: string) => {
    const session = await loadSession(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setState({ status: "signedIn", ...session });
  }, []);

  const signIn = useCallback(
    async (input: Credentials) => {
      const logged = await loginRequest(input);
      await applyToken(logged.token);
    },
    [applyToken],
  );

  const signUp = useCallback(
    async (input: RegisterInput) => {
      const registered = await registerRequest(input);
      await applyToken(registered.token);
    },
    [applyToken],
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
    () => ({ state, signIn, signUp, signOut, refreshCourts, saveSettings }),
    [state, signIn, signUp, signOut, refreshCourts, saveSettings],
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
