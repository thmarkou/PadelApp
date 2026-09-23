# Φιλοξενία PadelApp (ΕΕ, δική μας)

Υποδομή σαν Padelmatch / Book+Play: **εμείς** τρέχουμε API, desk και βάση. Το club μπαίνει σε μια σελίδα. Ο παίκτης ανοίγει το app.

Δεν είναι εθνικό δίκτυο ranking. Είναι μία πλατφόρμα, πολλά club, χωρισμένα με `club_id`.

## Τι βλέπει ο πελάτης

| Ποιος | Πού μπαίνει |
|---|---|
| Γραμματεία / ιδιοκτήτης | `https://desk.…` (ένα URL για όλα τα club, σύνδεση με κωδικό club) |
| Παίκτης | App Store / Play — το app χτυπάει `https://api.…` |

Δεν του ζητάμε VPS, domain `api.το-club.gr`, ούτε `pg_dump`.

## Πάροχος (κλείδωμα)

**Πρώτη επιλογή: Hetzner Cloud**, Falkenstein ή Helsinki (Γερμανία / Φινλανδία). Γερμανική εταιρεία από το 1997, data center μόνο ΕΕ για εμάς, καλή φήμη uptime, τιμή που σηκώνει συνδρομή λίγων club.

| Κομμάτι | Πακέτο | Περίπου / μήνα (χωρίς ΦΠΑ) |
|---|---|---|
| API + desk + Postgres | Cloud **CX33** — 4 vCPU, 8 GB RAM, 80 GB, 20 TB traffic | **€8,49** |
| Αντίγραφα εκτός μηχανήματος | Storage Box **BX11** — 1 TB, Γερμανία ή Φινλανδία | **€3,20** |
| Domain | `padelapp.gr` (ή ό,τι αγοράσουμε) | ~€1 (€12/έτος) |

**Σύνολο δικό μας: περίπου €13–18/μήνα** με ΦΠΑ. Αρκεί για τα πρώτα ~10 club. Όταν γεμίσει, ανεβαίνουμε CX43, όχι δεύτερο πάροχο.

**Αναπληρωματικό:** OVHcloud VPS-2 (Γαλλία / ΕΕ), ~€7,21, 4 vCPU / 8 GB, ημερήσιο backup μέσα στην τιμή. Λίγο λιγότερος δίσκος. Το παίρνουμε αν ο Hetzner δεν ανοίγει λογαριασμό ή θέλουμε δεύτερη χώρα ΕΕ.

**Όχι για v1:** AWS / Google / Azure (5–10× τιμή). Fly.io (ακριβό για το μέγεθός μας). Scaleway DEV1-L (~€31 για 8 GB). Contabo και άγνωστα «φθηνά VPS» (uptime / support).

## Τι τρέχουμε εμείς

Όλα στον παραπάνω πάροχο, **εντός ΕΕ**. Όχι ΗΠΑ ως κύρια εγκατάσταση.

| Κομμάτι | Ρόλος |
|---|---|
| PostgreSQL 16 | Μία βάση, πολλά `club_id`. Δεν ακούει στο δημόσιο internet. |
| API (`apps/api`) | Ένα process / service για όλα τα club. |
| Desk (`apps/web`) | Ένα site για όλα τα backoffice. |
| Αντίγραφα | Καθημερινό `pg_dump` (ή PITR) σε δεύτερο χώρο στην ΕΕ. Κράτημα ≥ 7 ημερών. |
| 24/7 | Process supervisor + επανεκκίνηση + health `GET /health`. Ειδοποίηση αν πέσει. |

Node 20. HTTPS μπροστά (Caddy ή nginx). Firewall: 22 (δικό μας), 80, 443.

## Δημόσια ονόματα (στόχος v1)

Αντικαθίστανται με το οριστικό domain όταν το αγοράσουμε.

```
https://api.padelapp.gr      → API
https://desk.padelapp.gr     → backoffice
```

Το κινητό production build έχει σταθερό `EXPO_PUBLIC_PADELAPP_API_URL` σε αυτό το API. Ο παίκτης βάζει **κωδικό club**, όχι διεύθυνση server.

`.env` παραγωγής (όχι στο git):

```
NODE_ENV=production
PADELAPP_API_PORT=3040
PADELAPP_API_HOST=127.0.0.1
PADELAPP_DATABASE_URL=postgres://…@127.0.0.1:5432/padelapp
PADELAPP_WEB_ORIGIN=https://desk.padelapp.gr
NEXT_PUBLIC_PADELAPP_API_URL=https://api.padelapp.gr
PADELAPP_SEED_PASSWORD=   # ποτέ padel-dev σε live
```

## Νέο club

1. Εμείς (ή αργότερα φόρμα onboard) δημιουργούμε τη γραμμή `clubs` + owner.
2. Του δίνουμε κωδικό club + desk URL + οδηγίες app.
3. Δεν στήνουμε δεύτερο server.

Το isolation test μένει υποχρεωτικό: το A δεν διαβάζει γήπεδα / παίκτες / κρατήσεις του B.

## Αντίγραφα

- Κάθε νύχτα: dump σε object storage **στην ΕΕ**.
- Δοκιμή επαναφοράς τουλάχιστον μία φορά πριν το πρώτο live club.
- Η βάση δεν είναι η μόνη κόπια των δεδομένων.

## 24/7

- systemd (ή ισοδύναμο) κρατάει API και desk πάνω.
- `curl -s https://api.…/health` → `{"ok":true,"service":"padelapp-api"}`.
- Αν πέσει το health, ειδοποίηση σε εμάς (όχι στο club να «ξεκινήσει τον server»).

## Dev στον Mac

Αμετάβλητο: PGlite, `:3040` / `:3041` / Metro 8084. Η παραγωγή είναι PostgreSQL στην ΕΕ, όχι το laptop του ιδιοκτήτη.
