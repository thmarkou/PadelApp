# PadelApp

Λειτουργικό σύστημα για padel club: **desk στο browser**, **κινητό παίκτη** (ένα Expo app).
Εμείς φιλοξενούμε API και βάση στην ΕΕ. Όχι εθνικό πρωτάθλημα. Ελληνικά και Αγγλικά.

Διάβασε [docs/PRODUCT.md](docs/PRODUCT.md), [docs/PLAN.md](docs/PLAN.md) και [docs/CHANGELOG.md](docs/CHANGELOG.md) πριν γράψεις κώδικα. Store: [docs/STORE.md](docs/STORE.md). Φιλοξενία: [docs/HOSTING.md](docs/HOSTING.md).

## Isolation

Τρέχει **μόνο** από αυτόν τον φάκελο. Όχι shared `node_modules` / `.env` / ports με άλλες εφαρμογές.

```bash
cd /Users/fanis/AIProjects/cursor/PadelApp
nvm use
cp env.padelapp.example .env.padelapp
npm install
npm run db:migrate
npm run db:seed
```

- API (dev): `0.0.0.0:3040`
- Desk (ρεσεψιόν): `127.0.0.1:3041`
- Expo / Metro: **8084**
- Βάση ανάπτυξης: PGlite σε `./data/pglite`

```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
```

iPhone: Xcode, πραγματικό iPhone 14 Pro Max, scheme Release. Η εφαρμογή δείχνει στη LAN IP του Mac (όχι `127.0.0.1`).

Desk: http://127.0.0.1:3041 — μόνο owner / reception / coach.

## Seed (εσωτερικό)

Ίδιος κωδικός: `padel-dev`.

| Club | Γήπεδα | Email ρόλων |
|---|---|---|
| `club-a` | 3 (2 κλειστά, 1 ανοιχτό) | `owner@club-a.local`, `reception@…`, `coach@…`, `player@…` |
| `club-b` | 2 ανοιχτά | `owner@club-b.local`, … ίδιο μοτίβο |

## Δομή

- `apps/mobile` — iPhone, iPad, Android (παίκτης και staff στο γήπεδο)
- `apps/web` — desk γραμματείας (browser)
- `apps/api` — ένα API, πολλά club (`club_id`)
- `packages/shared` — τύποι, ρυθμίσεις, μηχανές σλοτ / ζευγαριών
