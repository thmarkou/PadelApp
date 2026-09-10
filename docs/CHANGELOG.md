# PadelApp — ημερολόγιο

## 10 Σεπτεμβρίου 2026 (φάση 7)

Store / γλώσσες / απομόνωση / VPS, χωρίς να ανοίξουμε web.

- Login: ο παίκτης βάζει κωδικό club. Η διεύθυνση server είναι προαιρετική («προχωρημένο»). Στο Store δεν προ-γεμίζουμε `padel-dev`.
- `npm run lint:i18n`: el και en πρέπει να έχουν τα ίδια κλειδιά. Τα `t("…")` στο κινητό πρέπει να υπάρχουν και στα δύο.
- Isolation test: δύο club στην ίδια βάση, το A δεν διαβάζει γήπεδα/παίκτες του B.
- Docs: [STORE.md](STORE.md) (listing δωρεάν, review notes), [VPS.md](VPS.md), [PRIVACY.md](PRIVACY.md).
- `apps/mobile/eas.json` για μελλοντικό TestFlight / Android internal. Η υποβολή στο Store μένει χειροκίνητη.

## 10 Σεπτεμβρίου 2026

Πρώτο ανέβασμα του κώδικα στο GitHub. Το repo πριν είχε μόνο το product brief. Σήμερα κλείδωσε το **κινητό-μόνο** προϊόν και μπήκαν οι φάσεις **0–6**, μαζί με **ολοκληρωτική διαγραφή παίκτη (GDPR)**.

### Φάσεις 0–1 — θεμέλιο και ρυθμίσεις

- Isolated monorepo: `apps/mobile` (Expo, `com.padelapp.app`), `apps/api` (JSON στο `:3040`), `packages/shared`.
- Metro **8084**, Node 20, `.env.padelapp`, PGlite σε `./data/pglite`.
- Ελληνικά και Αγγλικά από την πρώτη οθόνη. Ρόλοι: owner / reception / coach / player στο ίδιο app.
- Ρυθμίσεις club: brand, σλοτ, ακύρωση, επίπεδα, open match, pairing, presets τουρνουά, feature flags.

### Φάσεις 2–4 — γήπεδα, ημερολόγιο, παίκτες, ανοιχτά ματς

- CRUD γηπέδων. Ημερολόγιο ημέρας, κράτηση 1–4, waitlist, ακύρωση με κανόνα του club.
- Παίκτες: φύλο, έτος γέννησης, self-level, confirmed level, ζώνες A/B/C.
- Open match «λείπει 1 / 2» με φίλτρο ± επίπεδο. Καθημερινό ζευγάρωμα **μόνο δύναμη**, όχι φύλο.

### Φάση 5 — μηχανή ζευγαριών

- Snake 1 με N, 2 με N−1. Mexicano από standings.
- Κουμπί staff στην τετράδα. Admin override (κύκλος των 3 foursomes) αν το επιτρέπει το club.

### GDPR — ολοκληρωτική διαγραφή

- `DELETE /players/:id` και κουμπί στο προφίλ.
- Φεύγουν λογαριασμός, session και καρτέλα παίκτη.
- Οι κρατήσεις μένουν στο ημερολόγιο ως `—`.
- Ο **owner δεν διαγράφεται**. Η ρεσεψιόν σβήνει επισκέπτες και λογαριασμούς `player`, όχι coach/reception.
- Παίκτης (και coach) σβήνουν τον εαυτό τους και αποσυνδέονται.
- Το flag `gdprExport` μένει για αργότερα — τώρα έχουμε διαγραφή, όχι εξαγωγή αρχείου.

### Φάση 6 — τουρνουά

- Δημιουργία από preset (format + scoring). Κατηγορίες: ανδρών / γυναικών / **μικτό = άντρας+γυναίκα vs άντρας+γυναίκα**.
- Προαιρετικά όριο ηλικίας και επιπέδου. Χωρίς φύλο ή έτος στο προφίλ → ρητό μήνυμα, όχι σιωπηλή απόρριξη.
- Εγγραφή, γύροι, σκορ από κινητό, standings (πόντοι και στους δύο του ζευγαριού).
- Mexicano ξαναζευγαρώνει από βαθμολογία.
- Seed Club A: «Βραδιά Mexicano» με Γυναικών και Μικτό.
- Οθόνες από Αρχική / Περισσότερα (χωρίς νέα καρτέλα στη μπάρα).

### Πώς τρέχει

```bash
nvm use
npm install
npm run db:migrate
npm run db:seed
npm run dev:api
```

iPhone: Xcode, scheme **Release**, Clean Build Folder, μετά ▶. Seed: `owner@club-a.local` / `padel-dev`.
