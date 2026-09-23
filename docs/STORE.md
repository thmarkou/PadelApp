# PadelApp στο App Store και στο Google Play

Ένα listing, ένα binary: `com.padelapp.app`. Δωρεάν κατέβασμα. Δεν πουλάμε στήσιμο μέσα στο Store.

## Τι γράφουμε δημόσια (listing)

**Όνομα:** PadelApp  
**Υπότιτλος:** Κράτηση, επίπεδα, τουρνουά

**Περιγραφή (σύντομη):**

Κλείσε γήπεδο, βρες τετράδα όταν λείπει 1 ή 2, δες το επίπεδό σου, γράψου σε τουρνουά. Ελληνικά και Αγγλικά.

Για μέλη club που χρησιμοποιούν PadelApp: άνοιξε την εφαρμογή και βάλε τον κωδικό που σου έδωσε το club.

Μία εφαρμογή για παίκτες (iPhone, Android). Η γραμματεία δουλεύει από browser στο laptop του club. Δεν είναι εθνικό πρωτάθλημα.

**Τιμή Store:** Δωρεάν. Χωρίς in-app αγορά club.

**Μην γράψεις στο listing:** τιμές συνδρομής, servers, «δεν είναι απλό download», API.

## Review notes (μόνο στον reviewer, όχι στο κοινό)

Demo API (δικό μας test server όσο τρέχει το TestFlight).

- Club: `club-a`
- Παίκτης: `player@club-a.local` / `padel-dev`
- Ρεσεψιόν: `reception@club-a.local` / `padel-dev`
- Owner: `owner@club-a.local` / `padel-dev`

Το app χρειάζεται λογαριασμό club. Δεν είναι κέλυφος χωρίς λειτουργία: με τα παραπάνω βλέπεις ημερολόγιο, ανοιχτά ματς, προφίλ.

## iOS TestFlight

1. Apple Developer: bundle `com.padelapp.app`.
2. Από `apps/mobile`: `npx eas-cli build --platform ios --profile preview` (internal) ή `--profile production` για Submit.
3. Privacy policy URL: στατική σελίδα με το κείμενο στο [PRIVACY.md](PRIVACY.md) (όχι admin site).
4. Συσκευή δοκιμής: iPhone 14 Pro Max, scheme Release όπως στο dev.

## Android internal testing

1. `npx eas-cli build --platform android --profile preview`
2. Play Console → internal testing track.
3. Ίδιο bundle `com.padelapp.app`.

Δεν κάνουμε ξεχωριστό app ανά club στο Store.
