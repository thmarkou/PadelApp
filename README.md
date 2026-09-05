# PadelApp

White-label SaaS για padel clubs: web ρεσεψιόν + mobile παίκτη.
Ένα codebase, πολλά club (`club_id`). Ελλάδα πρώτα.

Το προϊόν και οι αποφάσεις είναι στο [docs/PRODUCT.md](docs/PRODUCT.md).
Διάβασέ το πριν γράψεις κώδικα.

## Project Structure

Αυτή η εφαρμογή τρέχει σε **απομονωμένο περιβάλλον** ώστε να μην συγκρούεται με
άλλες εφαρμογές στον ίδιο δίσκο (VoiceAction, Survival Plan, Dental, Horeca).

- Δικός φάκελος, δικό git, δικό GitHub remote
- Δικό `node_modules` — ποτέ κοινό με άλλο project
- Δικό `.nvmrc` (Node 20) — πάντα `nvm use` εδώ μέσα
- Δικό `.env.padelapp` — ποτέ `.env` από άλλο app
- Δικά Metro / Expo ports (**8084**) — όχι το default 8081 αν τρέχει άλλο RN app

## Κατάσταση

Αρχικό repo. Δεν υπάρχει ακόμα εφαρμογή — μόνο το product brief.

Επόμενο βήμα: scaffold TypeScript (Expo / React Native + web admin + shared API),
με `club_id` από την πρώτη μέρα, **μέσα σε αυτόν τον φάκελο**.

## Απαιτήσεις (όταν μπει κώδικας)

- Node 20 (`nvm use` από `/Users/fanis/AIProjects/cursor/PadelApp`)
- TypeScript
- Tailwind v4 στο web

## Environment Setup

Όταν μπει το scaffold:

```bash
cd /Users/fanis/AIProjects/cursor/PadelApp
nvm use
cp env.padelapp.example .env.padelapp
npm install
npm start
```

- **`.env.padelapp`**: τοπικό config (δεν μπαίνει στο git)
- **`env.padelapp.example`**: template χωρίς secrets
