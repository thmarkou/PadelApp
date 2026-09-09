"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, setToken } from "@/lib/api";

type PublicClub = { slug: string; name: string };

export default function LoginPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<PublicClub[]>([]);
  const [clubSlug, setClubSlug] = useState("club-a");
  const [email, setEmail] = useState("owner@club-a.local");
  const [password, setPassword] = useState("padel-dev");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ clubs: PublicClub[] }>("/public/clubs")
      .then((data) => {
        setClubs(data.clubs);
        const first = data.clubs[0];
        if (first) {
          setClubSlug(first.slug);
          setEmail(`owner@${first.slug}.local`);
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Αποτυχία φόρτωσης clubs");
      });
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ clubSlug, email, password }),
      });
      setToken(result.token);
      router.push("/settings");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Αποτυχία σύνδεσης");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-sm tracking-wide text-court uppercase">PadelApp</p>
      <h1 className="mt-2 text-3xl font-semibold">Ρεσεψιόν</h1>
      <p className="mt-2 text-sm text-ink/70">
        Εσωτερικό περιβάλλον. Διάλεξε club — οι ρυθμίσεις είναι διαφορετικές ανά
        επιχείρηση.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <label className="block text-sm">
          Club
          <select
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2"
            value={clubSlug}
            onChange={(event) => {
              setClubSlug(event.target.value);
              setEmail(`owner@${event.target.value}.local`);
            }}
          >
            {clubs.map((club) => (
              <option key={club.slug} value={club.slug}>
                {club.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="block text-sm">
          Κωδικός
          <input
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-court px-4 py-2.5 text-white disabled:opacity-60"
        >
          {busy ? "Σύνδεση…" : "Σύνδεση"}
        </button>
      </form>
    </main>
  );
}
