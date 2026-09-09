import type {
  AppRole,
  AppUser,
  Club,
  ClubSettings,
  Court,
  Player,
  PairingResult,
  StandingRow,
  Tournament,
  TournamentCategory,
  TournamentStatus,
} from "@padelapp/shared";
import { canManagePlayers, canOverridePairing, canProposePairing } from "@padelapp/shared";
import i18n from "../i18n";
import { apiCandidates, resetApiBase, setResolvedApiBase } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

type ErrorPayload = {
  error?: unknown;
  code?: unknown;
};

function readError(payload: unknown, status: number): ApiError {
  const body = payload as ErrorPayload;
  const code = typeof body.code === "string" ? body.code : "internal";
  const fallback =
    typeof body.error === "string" ? body.error : i18n.t("errors.internal");
  const translated = i18n.t(`errors.${code}`, { defaultValue: fallback });
  return new ApiError(translated, status, code);
}

async function fetchUrl(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function ping(base: string): Promise<boolean> {
  try {
    const response = await fetchUrl(`${base}/health`, { headers: { Accept: "application/json" } }, 2500);
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean };
    return response.ok && payload.ok === true;
  } catch {
    return false;
  }
}

let resolveInFlight: Promise<string> | null = null;

export async function resolveApiBase(): Promise<string> {
  if (resolveInFlight) {
    return resolveInFlight;
  }
  resolveInFlight = (async () => {
    const candidates = apiCandidates();
    const hits = await Promise.all(candidates.map(async (url) => ((await ping(url)) ? url : null)));
    const winner = hits.find((url) => url !== null);
    const fallback =
      candidates.find((url) => !url.includes("127.0.0.1")) ?? candidates[0];
    const chosen = winner ?? fallback;
    setResolvedApiBase(chosen);
    return chosen;
  })().finally(() => {
    resolveInFlight = null;
  });
  return resolveInFlight;
}

export function retryApiDiscovery(): void {
  resetApiBase();
  resolveInFlight = null;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null; timeoutMs?: number } = {},
): Promise<T> {
  const { token, timeoutMs = 8000, headers: initHeaders, signal, ...rest } = init;
  const headers = new Headers(initHeaders);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const base = await resolveApiBase();
  let response: Response;
  try {
    response = await fetchUrl(`${base}${path}`, { ...rest, headers, signal }, timeoutMs);
  } catch {
    throw new ApiError(i18n.t("errors.network"), 0, "network");
  }

  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw readError(payload, response.status);
  }
  return payload as T;
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const result = await apiFetch<{ ok: boolean }>("/health");
    return result.ok;
  } catch {
    return false;
  }
}

export type PublicClub = { slug: string; name: string };

export async function fetchPublicClubs(): Promise<PublicClub[]> {
  const result = await apiFetch<{ clubs: PublicClub[] }>("/public/clubs");
  return result.clubs;
}

export type LoginResponse = {
  token: string;
  user: AppUser;
  club: Club;
};

export async function loginRequest(input: {
  clubSlug: string;
  email: string;
  password: string;
}): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchMe(token: string): Promise<{ user: AppUser; club: Club }> {
  return apiFetch("/me", { token });
}

export async function fetchCourts(token: string): Promise<Court[]> {
  const result = await apiFetch<{ courts: Court[] }>("/courts", { token });
  return result.courts;
}

export async function fetchSettings(token: string): Promise<ClubSettings> {
  const result = await apiFetch<{ settings: ClubSettings }>("/settings", { token });
  return result.settings;
}

export async function saveSettingsRequest(
  token: string,
  settings: ClubSettings,
): Promise<ClubSettings> {
  const result = await apiFetch<{ settings: ClubSettings }>("/settings", {
    method: "PUT",
    token,
    body: JSON.stringify(settings),
  });
  return result.settings;
}

export function canEditClubSettings(role: AppRole): boolean {
  return role === "owner" || role === "reception";
}

export function canEditCourts(role: AppRole): boolean {
  return role === "owner" || role === "reception";
}

export function canManageTournaments(role: AppRole): boolean {
  return role === "owner" || role === "reception";
}

export function canScoreTournaments(role: AppRole): boolean {
  return role === "owner" || role === "reception" || role === "coach";
}

export async function logoutRequest(token: string): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST", token });
  } catch {
    // Local sign-out still proceeds if the session is already gone.
  }
}

export async function createCourt(
  token: string,
  body: {
    name: string;
    kind: "indoor" | "outdoor";
    openTime: string;
    closeTime: string;
    isActive?: boolean;
    sortOrder?: number;
  },
): Promise<{ id: string }> {
  return apiFetch("/courts", { method: "POST", token, body: JSON.stringify(body) });
}

export async function patchCourt(
  token: string,
  courtId: string,
  body: {
    name?: string;
    kind?: "indoor" | "outdoor";
    openTime?: string;
    closeTime?: string;
    isActive?: boolean;
    sortOrder?: number;
  },
): Promise<void> {
  await apiFetch(`/courts/${courtId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export type ClubPlayer = Pick<Player, "id" | "displayName">;

export async function searchPlayers(token: string, q: string): Promise<ClubPlayer[]> {
  const query = new URLSearchParams();
  if (q.trim()) {
    query.set("q", q.trim());
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const result = await apiFetch<{ players: Player[] }>(`/players${suffix}`, { token });
  return result.players;
}

export async function fetchPlayers(token: string, q = ""): Promise<Player[]> {
  const query = new URLSearchParams();
  if (q.trim()) {
    query.set("q", q.trim());
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const result = await apiFetch<{ players: Player[] }>(`/players${suffix}`, { token });
  return result.players;
}

export async function fetchPlayer(token: string, playerId: string): Promise<Player> {
  const result = await apiFetch<{ player: Player }>(`/players/${playerId}`, { token });
  return result.player;
}

export async function fetchMyPlayer(token: string): Promise<Player> {
  const result = await apiFetch<{ player: Player }>("/players/me", { token });
  return result.player;
}

export async function createPlayer(
  token: string,
  body: {
    displayName: string;
    phone?: string | null;
    email?: string | null;
    gender?: Player["gender"];
    birthYear?: number | null;
    selfLevel?: number | null;
  },
): Promise<Player> {
  const result = await apiFetch<{ player: Player }>("/players", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
  return result.player;
}

export async function patchPlayer(
  token: string,
  playerId: string,
  body: {
    displayName?: string;
    phone?: string | null;
    email?: string | null;
    gender?: Player["gender"];
    birthYear?: number | null;
    selfLevel?: number | null;
  },
): Promise<Player> {
  const result = await apiFetch<{ player: Player }>(`/players/${playerId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
  return result.player;
}

export async function erasePlayer(token: string, playerId: string): Promise<void> {
  await apiFetch(`/players/${playerId}`, { method: "DELETE", token });
}

export async function confirmPlayerLevel(
  token: string,
  playerId: string,
  level: number,
): Promise<Player> {
  const result = await apiFetch<{ player: Player }>(`/players/${playerId}/confirm-level`, {
    method: "POST",
    token,
    body: JSON.stringify({ level }),
  });
  return result.player;
}

export { canManagePlayers, canOverridePairing, canProposePairing };

export async function proposePairing(token: string, bookingId: string): Promise<PairingResult> {
  const result = await apiFetch<{ pairing: PairingResult }>(`/bookings/${bookingId}/pair`, {
    method: "POST",
    token,
  });
  return result.pairing;
}

export async function cyclePairingRequest(token: string, bookingId: string): Promise<PairingResult> {
  const result = await apiFetch<{ pairing: PairingResult }>(`/bookings/${bookingId}/pair/cycle`, {
    method: "POST",
    token,
  });
  return result.pairing;
}

export type SlotSpot = {
  position: number;
  name: string;
  playerId: string | null;
  addedBy: string | null;
};

export type DaySlot = {
  startsAt: string;
  durationMinutes: number;
  maintenance: boolean;
  booking: {
    id: string;
    createdBy: string | null;
    mine: boolean;
    meOnBooking?: boolean;
    spots: SlotSpot[];
    openSpots: number;
    pairing?: PairingResult | null;
  } | null;
  waitlistCount: number;
  waitlist: Array<{ id: string; guestName: string }>;
};

export type DayCourt = {
  id: string;
  name: string;
  kind: "indoor" | "outdoor";
  slots: DaySlot[];
};

export type DaySlotsResponse = {
  date: string;
  durationMinutes: number;
  cancelHoursBefore: number;
  waitlistEnabled: boolean;
  courts: DayCourt[];
};

export async function fetchDaySlots(
  token: string,
  date: string,
  durationMinutes?: number,
): Promise<DaySlotsResponse> {
  const query = new URLSearchParams({ date });
  if (durationMinutes !== undefined) {
    query.set("duration", String(durationMinutes));
  }
  return apiFetch(`/slots?${query.toString()}`, { token });
}

export async function createBooking(
  token: string,
  body: {
    courtId: string;
    startsAt: string;
    durationMinutes: number;
    spots: Array<{ name: string; playerId?: string }>;
  },
): Promise<{ id: string }> {
  return apiFetch("/bookings", { method: "POST", token, body: JSON.stringify(body) });
}

export async function joinBooking(
  token: string,
  bookingId: string,
  spot: { name: string; playerId?: string },
): Promise<void> {
  await apiFetch(`/bookings/${bookingId}/spots`, {
    method: "POST",
    token,
    body: JSON.stringify(spot),
  });
}

export async function cancelBooking(token: string, bookingId: string): Promise<void> {
  await apiFetch(`/bookings/${bookingId}/cancel`, { method: "POST", token });
}

export type OpenMatch = {
  bookingId: string;
  courtId: string;
  courtName: string;
  startsAt: string;
  durationMinutes: number;
  openSpots: number;
  matchLevel: number | null;
  inRange: boolean;
  mine: boolean;
  meOnBooking: boolean;
  spots: Array<{ position: number; name: string; playerId: string | null; level: number | null }>;
};

export type OpenMatchesResponse = {
  days: number;
  levelDelta: number;
  allowedMissing: Array<1 | 2>;
  myLevel: number | null;
  matches: OpenMatch[];
};

export async function fetchOpenMatches(token: string, days = 7): Promise<OpenMatchesResponse> {
  return apiFetch(`/open-matches?days=${days}`, { token });
}

export async function leaveBooking(token: string, bookingId: string): Promise<void> {
  await apiFetch(`/bookings/${bookingId}/leave`, { method: "POST", token });
}

export function openMatchToSlot(match: OpenMatch): DaySlot {
  return {
    startsAt: match.startsAt.length === 16 ? `${match.startsAt}:00` : match.startsAt,
    durationMinutes: match.durationMinutes,
    maintenance: false,
    booking: {
      id: match.bookingId,
      createdBy: null,
      mine: match.mine,
      meOnBooking: match.meOnBooking,
      spots: match.spots.map((spot) => ({
        position: spot.position,
        name: spot.name,
        playerId: spot.playerId,
        addedBy: null,
      })),
      openSpots: match.openSpots,
      pairing: null,
    },
    waitlistCount: 0,
    waitlist: [],
  };
}

export async function joinWaitlist(
  token: string,
  body: {
    courtId: string;
    startsAt: string;
    durationMinutes: number;
    name: string;
    playerId?: string;
  },
): Promise<void> {
  await apiFetch("/waitlist", { method: "POST", token, body: JSON.stringify(body) });
}

export function isStaffRole(role: AppRole): boolean {
  return role === "owner" || role === "reception" || role === "coach";
}

export type TournamentListItem = Tournament & { categories: TournamentCategory[] };

export type TournamentEntry = {
  id: string;
  playerId: string;
  displayName: string;
  gender: Player["gender"];
  birthYear: number | null;
  level: number | null;
};

export type TournamentMatchView = {
  id: string;
  courtIndex: number;
  pairA: string[];
  pairB: string[];
  playerIds: { a1: string | null; a2: string | null; b1: string | null; b2: string | null };
  scoreA: number | null;
  scoreB: number | null;
};

export type TournamentRoundView = {
  id: string;
  number: number;
  matches: TournamentMatchView[];
};

export type CategoryDetail = {
  tournament: Tournament | undefined;
  category: TournamentCategory;
  entries: TournamentEntry[];
  standings: StandingRow[];
  rounds: TournamentRoundView[];
};

export async function fetchTournaments(token: string): Promise<TournamentListItem[]> {
  const result = await apiFetch<{ tournaments: TournamentListItem[] }>("/tournaments", { token });
  return result.tournaments;
}

export async function fetchTournament(
  token: string,
  tournamentId: string,
): Promise<{ tournament: Tournament; categories: TournamentCategory[] }> {
  return apiFetch(`/tournaments/${tournamentId}`, { token });
}

export async function createTournament(
  token: string,
  body: {
    name: string;
    startsOn: string;
    presetId: string;
    categories: Array<{
      name: string;
      gender: TournamentCategory["gender"];
      minAge?: number | null;
      maxAge?: number | null;
      minLevel?: number | null;
      maxLevel?: number | null;
    }>;
  },
): Promise<{ tournament: Tournament; categories: TournamentCategory[] }> {
  return apiFetch("/tournaments", { method: "POST", token, body: JSON.stringify(body) });
}

export async function setTournamentStatus(
  token: string,
  tournamentId: string,
  status: TournamentStatus,
): Promise<Tournament> {
  const result = await apiFetch<{ tournament: Tournament }>(`/tournaments/${tournamentId}/status`, {
    method: "POST",
    token,
    body: JSON.stringify({ status }),
  });
  return result.tournament;
}

export async function fetchCategory(token: string, categoryId: string): Promise<CategoryDetail> {
  return apiFetch(`/categories/${categoryId}`, { token });
}

export async function registerCategoryEntry(
  token: string,
  categoryId: string,
  playerId?: string,
): Promise<void> {
  await apiFetch(`/categories/${categoryId}/entries`, {
    method: "POST",
    token,
    body: JSON.stringify(playerId ? { playerId } : {}),
  });
}

export async function removeCategoryEntry(token: string, entryId: string): Promise<void> {
  await apiFetch(`/entries/${entryId}`, { method: "DELETE", token });
}

export async function generateCategoryRound(
  token: string,
  categoryId: string,
): Promise<{ leftover: Array<{ id: string; name: string }>; round: number }> {
  return apiFetch(`/categories/${categoryId}/rounds`, { method: "POST", token });
}

export async function saveMatchScore(
  token: string,
  matchId: string,
  scoreA: number,
  scoreB: number,
): Promise<void> {
  await apiFetch(`/matches/${matchId}/score`, {
    method: "POST",
    token,
    body: JSON.stringify({ scoreA, scoreB }),
  });
}
