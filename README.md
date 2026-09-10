# PadelApp

Λειτουργικό σύστημα για padel clubs ως **μία εφαρμογή iOS και Android**.
Χωρίς web έκδοση. Ελληνικά και Αγγλικά από την πρώτη οθόνη.

Διάβασε [docs/PRODUCT.md](docs/PRODUCT.md), [docs/PLAN.md](docs/PLAN.md) και [docs/CHANGELOG.md](docs/CHANGELOG.md) πριν γράψεις κώδικα. Store: [docs/STORE.md](docs/STORE.md). VPS: [docs/VPS.md](docs/VPS.md).

## Isolation

Τρέχει **μόνο** από αυτόν τον φάκελο. Όχι shared `node_modules` / `.env` / ports με VoiceAction, Survival, Dental, Horeca.

```bash
cd /Users/fanis/AIProjects/cursor/PadelApp
nvm use
cp env.padelapp.example .env.padelapp
npm install
npm run db:migrate
npm run db:seed
```

- API του club (JSON, χωρίς site): `0.0.0.0:3040`
- Expo / Metro: **8084**
- Βάση ανάπτυξης: PGlite σε `./data/pglite`

```bash
npm run dev:api
npm run dev:mobile
```

Δοκιμή iOS: Xcode, πραγματικό iPhone 14 Pro Max. Η εφαρμογή δείχνει στη LAN IP του Mac (όχι `127.0.0.1`).

Το `npm run dev:web` **δεν** είναι μέρος του προϊόντος.

## Seed (εσωτερικό)

Ίδιος κωδικός: `padel-dev`.

| Club | Γήπεδα | Email ρόλων |
|---|---|---|
| `club-a` | 3 (2 κλειστά, 1 ανοιχτό) | `owner@club-a.local`, `reception@…`, `coach@…`, `player@…` |
| `club-b` | 2 ανοιχτά | `owner@club-b.local`, … ίδιο μοτίβο |

Τα γήπεδα είναι εγγραφές του club, όχι σταθερός αριθμός στην εφαρμογή. Άλλαξε club στη σύνδεση και η λίστα αλλάζει.

## Δομή

- `apps/mobile` — το προϊόν (Expo, iOS + Android, ρεσεψιόν και παίκτης)
- `apps/api` — API ανά εγκατάσταση club
- `apps/web` — παγωμένο, δεν συνεχίζεται
- `packages/shared` — τύποι, ρυθμίσεις, μηχανές σλοτ / ζευγαριών
