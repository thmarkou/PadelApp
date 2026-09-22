# Εγκατάσταση API + desk στο VPS του club

Το API απαντάει στην εφαρμογή και στο desk. Τα δεδομένα στο ΑΦΜ του πελάτη. Δεν είναι εθνικό δίκτυο.

Εμείς το στήνουμε. Ο ιδιοκτήτης δεν ανοίγει Hetzner μόνος του.

## Τι αγοράζει το club (στον πάροχο, όχι σε εμάς)

- Μικρό VPS στην ΕΕ (1 vCPU, 2 GB RAM αρκεί για την αρχή), ~8–20€/μήνα
- Domain, π.χ. `api.example-club.gr`, ~12€/έτος
- Ubuntu 24.04 LTS

## Στο server

Node 20, PostgreSQL 16 (όχι PGlite σε παραγωγή), Caddy ή nginx για HTTPS.

```bash
# ως root, συντομία
apt update && apt install -y git postgresql nginx
# nvm / node 20
# clone του repo σε /opt/padelapp (api + web + packages/shared)
cp env.padelapp.example .env.padelapp
```

`.env.padelapp` στο server:

```
NODE_ENV=production
PADELAPP_API_PORT=3040
PADELAPP_API_HOST=127.0.0.1
PADELAPP_DATABASE_URL=postgres://padelapp:...@127.0.0.1:5432/padelapp
PADELAPP_SEED_PASSWORD=  # μην αφήσεις padel-dev στον πελάτη
```

```bash
nvm use
npm install
npm run build -w @padelapp/shared
npm run db:migrate
# seed μόνο σε δοκιμή, όχι σε ζωντανό club με πραγματικά ονόματα
npm run start -w @padelapp/api
```

systemd: `padelapp-api.service` → `npm run start -w @padelapp/api` με `WorkingDirectory=/opt/padelapp`.

Caddy/nginx:

- `https://api.example-club.gr` → `127.0.0.1:3040` (μόνο JSON)
- `https://desk.example-club.gr` → desk (`npm run start -w @padelapp/web` ή στατικό export πίσω από τον ίδιο proxy)

`.env.padelapp` στο server, επιπλέον:

```
PADELAPP_WEB_ORIGIN=https://desk.example-club.gr
NEXT_PUBLIC_PADELAPP_API_URL=https://api.example-club.gr
```

Firewall: 22, 80, 443. Η βάση δεν ακούει στο internet.

Αντίγραφα: καθημερινό `pg_dump` στο χώρο του club.

## Στην εφαρμογή

Στη σύνδεση, διεύθυνση club = `https://api.example-club.gr`. Ο παίκτης συνήθως δεν την αλλάζει: την αποθηκεύει η ρεσεψιόν την πρώτη φορά, ή μπαίνει έτοιμη στο TestFlight/production build του συγκεκριμένου πελάτη μέσω `EXPO_PUBLIC_PADELAPP_API_URL`.

Ένα Store listing για όλα τα club. Νέο club = νέο VPS + ίδιο app, όχι νέο binary.

## Έλεγχος

```bash
curl -s https://api.example-club.gr/health
# {"ok":true,"service":"padelapp-api"}
```

Club A σε αυτό το VPS δεν έχει γραμμές του Club B: ένα club ανά εγκατάσταση. Στο δικό μας seed (δύο clubs στο ίδιο API) το isolation test επιβεβαιώνει ότι τα `club_id` δεν διαρρέουν.
