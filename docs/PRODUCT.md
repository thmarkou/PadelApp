# Padel Club — Product brief

Πηγή αποφάσεων από το chat [Project discussion topics](8b92196f-4013-481d-9521-d0ddb00beae3).
Κάθε νέο chat στο `PadelApp` διαβάζει αυτό το αρχείο πριν γράψει κώδικα.

## Τι είναι

White-label SaaS για padel clubs (Ελλάδα πρώτα). Web ρεσεψιόν + mobile παίκτη.
Ένα app, πολλά club (`club_id`). Τα δεδομένα μένουν στο club, όχι marketplace.

Δεν ανταγωνιζόμαστε το Playtomic ως δίκτυο. Πουλάμε λειτουργικό σύστημα:
κρατήσεις + επίπεδα που τα ορίζει το club + τουρνουά/ζευγάρια.

## Πρώτος πελάτης

Ιδιοκτήτης γηπέδων padel. Ίδια εφαρμογή θα δοθεί και σε άλλα club.

## Εμπορικό (Ελλάδα)

- Starter 1–3 γήπεδα: €79–99/μήνα
- Club 4–8 γήπεδα: €129–179/μήνα
- Setup €500–1.500 (πιλοτικό πρώτο club: €5–8k + €99/μήνα)
- Όχι εφάπαξ πώληση κώδικα χωρίς σοβαρό ποσό (€40k+)

## MVP (v1)

1. Multi-tenant: club → δυναμικά γήπεδα (indoor/outdoor, ωράριο, συντήρηση)
2. Ημερολόγιο / σλοτ (όχι μόνο 90′) + λίστα αναμονής + ακύρωση
3. Παίκτες: προφίλ, επικοινωνία, επίπεδο
4. Επίπεδα: A/B/C + κλίμακα 1.0–7.0. Admin/προπονητής επιβεβαιώνει.
   Μετά απλό Elo από αποτελέσματα. Όχι μόνο self-rating.
5. Open match «λείπει 1 / 2» με φίλτρο ± επίπεδο
6. Ζευγάρια ίσης δύναμης: κοντινό rating + κοντινό άθροισμα ζευγαριού
   (1 με N, 2 με N-1 ή Mexicano από live standings). Admin μπορεί override.
7. Τουρνουά: εγγραφή ανά κατηγορία
8. Web reception + mobile παίκτη (iOS πρώτα ή RN και τα δύο)

## Τουρνουά — δομή

Americano, Mexicano, King of the Court, knockout, όμιλοι+KO, box league, round robin.

Δύο πεδία στη δημιουργία τουρνουά:

1. **Format:** Americano / Mexicano / KOTC / knockout / όμιλοι+KO / box / round robin
2. **Scoring:** επίσημο (games+sets) ή κοινωνικό (πόντοι / χρόνος)

## Τουρνουά — μέτρηση

**Επίσημο (FIP):**

- Game στο 40-40: Advantage / Golden Point / Star Point
- Set: κανονικό στους 6 + TB 7 · ή mini-set στους 4
- Ματς: 1 set · best of 3 πλήρη · best of 3 με 3ο = super TB 10 · ή TB 7

**Κοινωνικό (χωρίς 15-30-40):**

- Φιξ πόντοι 16 / 21 / 24 / 32
- Χρόνος 8–15 λεπτά
- KOTC race to 4 / 5 / 7

Προεπιλογές club:

- Βραδιά: Mexicano/Americano στους 24 πόντους
- Σαββατοκύριακο: σταθερά ζευγάρια, golden point, 2 sets + super TB 10

Οι 4 επίσημες προεπιλογές που αξίζει να υπάρχουν ως presets:

1. Best of 3, golden point, 3ο set super TB 10
2. Best of 3, advantage, 3ο set super TB 10
3. Ένα κανονικό set, golden point
4. Mini-sets (πρώτοι στα 4), golden point, best of 3

## Ζευγάρια ίσης δύναμης

Ζευγάρι ίσης δύναμης = δύο παίκτες με κοντινό rating **και** δύο ζευγάρια με
κοντινό **άθροισμα** επιπέδου (π.χ. 3.2+2.8 vs 3.0+3.0).

Αλγόριθμος:

- Ταξινόμηση παικτών, ζευγάρωμα 1 με N, 2 με N-1
- ή Mexicano από live standings (νικητές με νικητές)
- Admin μπορεί να αλλάξει ζευγάρι πριν τη σέντρα

## v1.1 / μετά (όχι πριν γεμίσει το MVP)

Πληρωμές / πακέτα ωρών / split 4 · no-show penalty · box leagues · μαθήματα
WhatsApp επιβεβαίωση · QR check-in · δυναμική τιμή · καιρός outdoor
φίλτρα γυναίκες/μεικτά/αρχάριοι · TV club · GDPR export club data

## Εκτός v1

Playtomic-killer discovery, Hawk-Eye, FIP world ranking, branded Store ανά club,
Google Play πριν σταθεροποιηθεί το iOS/web, exclusive πώληση κώδικα φτηνά.

## Κανάλι

App Store + web. Όχι door-to-door. Ελληνικά UI πρώτα, EN έτοιμο για επόμενα club.

## Αρχιτεκτονική (κλείδωμα)

- Ένα codebase, `club_id` παντού
- TypeScript
- Mobile: React Native / Expo (ίδια γραμμή με VoiceAction / Survival / Dental)
- Web admin: ξεχωριστό client, κοινό API
- Node 20 (`.nvmrc`)
- Tailwind v4 στο web
- Χωρίς `any` χωρίς τεκμηρίωση

## Απομόνωση περιβάλλοντος (κλείδωμα)

Το PadelApp τρέχει σε **δικό του isolated environment**. Ίδιο μοτίβο με το Dental:
ξεχωριστός φάκελος ώστε να μην συγκρούεται με VoiceAction, Survival, Dental ή άλλο app.

- Μόνο αυτό το repo: `/Users/fanis/AIProjects/cursor/PadelApp` — δικό git, δικό remote
- `nvm use` **μέσα σε αυτόν τον φάκελο** (`.nvmrc` = Node 20). Όχι shared Node από άλλο project
- Δικά `package.json` / `node_modules`. Ποτέ hoist στον parent, ποτέ symlink από άλλο app
- Δικό env: `.env.padelapp` (όχι `.env` άλλου project). Template: `env.padelapp.example`
- Δικά Metro / Expo ports (προεπιλογή **8084**), όχι 8081 αν τρέχει άλλο RN app
- Δικά paths για data / uploads / SQLite όταν μπουν
- Δικά bundle IDs όταν γίνει scaffold (`com.padelapp.*`) — όχι reuse από άλλο app

Κανόνας: `cd` στο `PadelApp` → `nvm use` → `npm install` → `npm start`.
Μην τρέχεις εντολές του PadelApp από VoiceAction / Survival / Dental.

## Τοποθέτηση αγοράς

Μην πούμε «θα νικήσουμε το Playtomic στο Store». Εκεί κερδίζει το δίκτυο.

Πες: white-label λειτουργικό σύστημα για ελληνικά (και μετά άλλα) padel clubs —
κράτηση + επίπεδα που τα ορίζει το club + τουρνουά/ζευγάρια + τα δεδομένα μένουν
στον ιδιοκτήτη. Ένα binary στο Store, πολλά club με κωδικό/subdomain.

Αντίπαλοι για ενημέρωση, όχι για αντιγραφή: Playtomic, PlayByPoint, Padel Fast,
PADO, AppPadel, PADELX, MATCHi.

Στη Θεσσαλονίκη πολλά club είναι ακόμα σε τηλέφωνο / Excel / δικό booking.
Αυτό είναι η ευκαιρία του πρώτου πελάτη.

## Ανοιχτά προς τον ιδιοκτήτη

1. Πόσα γήπεδα, indoor/outdoor, ωράριο, τιμή ανά ώρα.
2. Πληρωμή τώρα (μετρητά, κάρτα, Viva/Stripe) και αν θέλει in-app στο v1.
3. Δικό brand στο Store ή κοινό app πολλών club.
4. Ποιος βάζει το επίπεδο: αυτοδήλωση, προπονητής, ή και τα δύο.
5. Πρώτο τουρνουά: Americano βραδιού ή κανονικό knockout.
6. Αν σκέφτεται ήδη Playtomic — αν ναι, κερδίζουμε σε δεδομένα, προμήθεια, ελληνικά.

## Repo

- Local: `/Users/fanis/AIProjects/cursor/PadelApp`
- GitHub: https://github.com/thmarkou/PadelApp
