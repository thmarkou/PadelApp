#!/usr/bin/env python3
"""Build docs/PadelApp-manual-el-en.docx with the stdlib only."""

from __future__ import annotations

import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
OUT_EL = ROOT / "docs" / "PadelApp-manual-el.docx"
OUT_EN = ROOT / "docs" / "PadelApp-manual-en.docx"

NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'


def t(text: str) -> str:
    return f'<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/></w:rPr><w:t xml:space="preserve">{escape(text)}</w:t></w:r>'


def t_fmt(text: str, *, bold=False, size=22, color="071610") -> str:
    pr = [
        '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>',
        f"<w:sz w:val='{size}'/><w:szCs w:val='{size}'/>",
        f'<w:color w:val="{color}"/>',
    ]
    if bold:
        pr.append("<w:b/>")
    return f"<w:r><w:rPr>{''.join(pr)}</w:rPr><w:t xml:space='preserve'>{escape(text)}</w:t></w:r>"


def para(inner: str, style: str | None = None, after: int = 160) -> str:
    ppr = f"<w:spacing w:after='{after}' w:line='276' w:lineRule='auto'/>"
    if style:
        ppr = f'<w:pStyle w:val="{style}"/>' + ppr
    return f"<w:p><w:pPr>{ppr}</w:pPr>{inner}</w:p>"


def p(text: str) -> str:
    return para(t_fmt(text))


_step = 0


def h(text: str, level: int) -> str:
    global _step
    _step = 0
    size = {1: 36, 2: 28, 3: 24}[level]
    color = "06241B" if level != 2 else "0F8A58"
    return para(t_fmt(text, bold=True, size=size, color=color), style=f"Heading{level}", after=200)


def bullet(text: str) -> str:
    return para(
        t_fmt(text),
        style=None,
        after=80,
    ).replace(
        "<w:pPr>",
        '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>',
        1,
    )


def numbered(text: str) -> str:
    global _step
    _step += 1
    return para(t_fmt(f"{_step}. {text}"), after=80)


def note(text: str) -> str:
    ppr = (
        "<w:pBdr><w:left w:val='single' w:sz='16' w:space='8' w:color='0F8A58'/></w:pBdr>"
        "<w:ind w:left='200'/>"
        "<w:spacing w:after='200' w:before='80'/>"
    )
    return f"<w:p><w:pPr>{ppr}</w:pPr>{t_fmt(text, color='5A6F65')}</w:p>"


def page_break() -> str:
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def table(headers: list[str], rows: list[list[str]]) -> str:
    def cell(text: str, header: bool) -> str:
        shade = '<w:shd w:val="clear" w:fill="E7F0EA"/>' if header else ""
        return (
            "<w:tc><w:tcPr><w:tcW w:w='3000' w:type='dxa'/>"
            f"{shade}</w:tcPr>"
            f"{para(t_fmt(text, bold=header, size=20), after=40)}"
            "</w:tc>"
        )

    body = ["<w:tbl><w:tblPr><w:tblW w:w='9360' w:type='dxa'/></w:tblPr>"]
    body.append("<w:tr>" + "".join(cell(h, True) for h in headers) + "</w:tr>")
    for row in rows:
        body.append("<w:tr>" + "".join(cell(c, False) for c in row) + "</w:tr>")
    body.append("</w:tbl>")
    body.append(para(t_fmt(""), after=200))
    return "".join(body)


def greek() -> str:
    bits = [
        h("1. Τι είναι το PadelApp", 2),
        p("Το PadelApp είναι το λειτουργικό σύστημα ενός padel club: κρατήσεις γηπέδων, παίκτες και επίπεδα, open match, ζευγάρια ίσης δύναμης, και τουρνουά μέσα στο club. Δεν είναι marketplace, δεν είναι εθνικό πρωτάθλημα και δεν υπάρχει κοινό ranking μεταξύ club."),
        p("Δύο πόρτες στον πελάτη, ένα API δικό μας στην Ευρωπαϊκή Ένωση: το web desk στο laptop της γραμματείας και το κινητό του παίκτη. Η ίδια εφαρμογή μπορεί να ανοίξει και από staff στο γήπεδο."),
        bullet("Desk: browser — μόνο προσωπικό. Ένα URL για όλα τα club."),
        bullet("Κινητό: μία εφαρμογή στο App Store και στο Google Play (com.padelapp.app)."),
        bullet("API + βάση: σε data center στην ΕΕ, δικά μας. Αντίγραφα και 24/7 δικά μας. Όχι VPS στον πελάτη."),
        h("2. Ρόλοι και δικαιώματα", 2),
        table(
            ["Ρόλος", "Web desk", "Κινητό"],
            [
                ["Owner / ρεσεψιόν", "Τα πάντα: ημερολόγιο, κρατήσεις, παίκτες, γήπεδα, ρυθμίσεις, τουρνουά", "Ίδια δουλειά με το desk, ίδια στοιχεία σύνδεσης"],
                ["Προπονητής", "Ημερολόγιο, επίπεδα, σκορ, ζευγάρια", "Σκορ και ζευγάρια στο γήπεδο. Όχι δημιουργία τουρνουά, όχι ρυθμίσεις club"],
                ["Παίκτης", "Δεν μπαίνει. Αν ανοίξει το desk, βλέπει άρνηση", "Κλείνει γήπεδο, open match, προφίλ. Βλέπει τουρνουά και σκορ. Δεν φτιάχνει τουρνουά"],
            ],
        ),
        p("Ο owner και η ρεσεψιόν είναι το «admin». Ο παίκτης κάνει εγγραφή μόνος του στο κινητό. Λογαριασμούς προσωπικού τους ανοίγει το club."),
        h("3. Γλώσσες", 2),
        p("Ελληνικά και Αγγλικά από την πρώτη οθόνη. Στο desk πάνω δεξιά: EL / EN. Στο κινητό: εναλλαγή γλώσσας στην είσοδο και στο Περισσότερα. Η εφαρμογή ακολουθεί και τη συσκευή."),
        h("4. Web desk — σύνδεση και πλοήγηση", 2),
        h("4.1 Σύνδεση", 3),
        numbered("Άνοιξε το desk URL του club."),
        numbered("Διάλεξε club (αν υπάρχουν περισσότερα σε δοκιμή)."),
        numbered("Email και κωδικός προσωπικού."),
        numbered("Σύνδεση. Ο παίκτης κόβεται εδώ — του λέει να ανοίξει την εφαρμογή."),
        p("Σε μεγάλη οθόνη αριστερά φαίνεται το μήνυμα του desk, δεξιά η φόρμα."),
        h("4.2 Μπάρα πλοήγησης", 3),
        p("Σκούρα μπάρα πάνω: όνομα club, ρόλος, γλώσσα, αποσύνδεση. Από κάτω τα tab:"),
        bullet("Πίνακας ελέγχου — σύνοψη της ημέρας."),
        bullet("Πρόγραμμα — ημερολόγιο γηπέδων σε στήλες."),
        bullet("Κρατήσεις — λίστα της ημέρας."),
        bullet("Παίκτες — καρτέλες club."),
        bullet("Γήπεδα — εσωτερικό / εξωτερικό, ωράριο, συντήρηση."),
        bullet("Τουρνουά — διοργανώσεις του club."),
        bullet("Ρυθμίσεις — μόνο owner και ρεσεψιόν."),
        h("5. Πίνακας ελέγχου", 2),
        p("Δείχνει αριθμούς αυτού του club (όχι εθνικό ranking): σύνολο κρατήσεων ημέρας, ανοιχτά ματς (λείπει 1 ή 2), παίκτες, γήπεδα, πληρότητα ημέρας, αριθμός τουρνουά. Τα κουτιά είναι άσπρα, χωρίς χρώμα. Δεν υπάρχουν έσοδα / πορτοφόλι σε αυτό το version."),
        h("6. Πρόγραμμα (ημερολόγιο desk)", 2),
        p("Γήπεδα σε στήλες, ώρα στα αριστερά. Διαλέγεις ημερομηνία και διάρκεια σλοτ από τα πρότυπα του club (π.χ. 60′ / 90′ / 120′)."),
        h("Χρώματα σλοτ", 3),
        table(
            ["Κατάσταση", "Σημαίνει"],
            [
                ["Διαθέσιμο", "Κενό. Πατάς και κλείνεις."],
                ["Ανοιχτό", "Υπάρχει κράτηση αλλά λείπει 1 ή 2 παίκτες (open match)."],
                ["Κλεισμένο", "Τετράδα γεμάτη."],
                ["Συντήρηση", "Το γήπεδο δεν δέχεται κράτηση εκείνη την ώρα."],
            ],
        ),
        h("Πώς κλείνεις αγώνα από το desk", 3),
        numbered("Πήγαινε Πρόγραμμα. Διάλεξε μέρα. Το πλέγμα είναι 09:30–23:00 ανά 30′."),
        numbered("Διάρκεια αγώνα (60/90/120) = πόσο κρατάει το ματς, δεν αλλάζει το ωρολόγιο."),
        numbered("Αναζήτησε παίκτες πάνω (προαιρετικά, μέχρι 4). Άδειο = κρατάς το γήπεδο χωρίς ομάδα (λάιμ)."),
        numbered("Κλικ στο κενό σλοτ. 1–3 ονόματα = ανοιχτό (κεχριμπάρι). 4 = γεμάτο."),
        numbered("Ακύρωση: από το ίδιο σλοτ. Ισχύει ο κανόνας ωρών του club."),
        note("Επίσημο padel = 4 στο γήπεδο. Αν στο τουρνουά είναι 5+, ο ένας κάθεται — δεν μπαίνει πέμπτος σε ματς που έχει ήδη 4 και σκορ."),
        h("7. Κρατήσεις", 2),
        p("Λίστα της ημέρας: ώρα, διάρκεια, γήπεδο, ονόματα, τύπος (Αγώνας = 4 παίκτες, Ανοιχτό = λείπει 1/2). Άλλαξε μέρα με τα βελάκια. Δεν είναι ταμείο."),
        h("8. Παίκτες (desk)", 2),
        p("Βάση του club. Επίπεδο δικό μας (1.0–7.0 και ζώνες C / B / A), όχι βαθμοί εθνικού tour."),
        h("Λίστα", 3),
        p("Αναζήτηση με κουμπί. Κενή αναζήτηση + κουμπί = όλη η λίστα. Κλικ σε γραμμή = καρτέλα."),
        h("Νέος / επεξεργασία", 3),
        bullet("Όνομα, τηλέφωνο, email."),
        bullet("Φύλο: άνδρας / γυναίκα. Χωρίς φύλο δεν μπαίνει σε κατηγορία τουρνουά."),
        bullet("Έτος γέννησης — από εκεί βγαίνει η ηλικία."),
        bullet("Αυτοαξιολόγηση και επιβεβαιωμένο επίπεδο. Την επιβεβαίωση την κάνει coach ή admin, όπως ορίζει το club."),
        p("Elo: μετά το πρώτο σκορ ματς τουρνουά, το σύστημα μετακινεί λίγο το επιβεβαιωμένο επίπεδο. Κέρδος από δυνατότερο = μεγαλύτερη άνοδος. Δεν είναι ακρωνύμιο — είναι το σύστημα του Árpád Élő. Μένει μέσα στο club."),
        p("GDPR: η γραμματεία μπορεί να σβήσει πλήρως έναν παίκτη. Ο owner δεν σβήνεται από αυτό το κουμπί."),
        h("9. Γήπεδα (desk)", 2),
        p("Λίστα γηπέδων. Νέο / επεξεργασία: όνομα, εσωτερικό ή εξωτερικό, ώρα ανοίγματος / κλεισίματος, σειρά, συντήρηση μέχρι ημερομηνία. Ο παίκτης στο κινητό βλέπει ωράρια, δεν τα αλλάζει."),
        h("10. Τουρνουά — δημιουργία", 2),
        p("Τουρνουά = διοργάνωση του club με preset (format + μέτρηση) και μία ή περισσότερες κατηγορίες."),
        h("10.1 Φόρμα Νέο τουρνουά", 3),
        numbered("Τουρνουά → Νέο τουρνουά."),
        numbered("Όνομα (π.χ. «Βραδιά Παρασκευής»)."),
        numbered("Ημερομηνία."),
        numbered("Preset club — αυτό ορίζει format και σκορ."),
        numbered("Κατηγορία 1: όνομα, φύλο, προαιρετικά ηλικία και επίπεδο."),
        numbered("Προσθήκη κατηγορίας μόνο αν θέλεις δεύτερο ταμπλό την ίδια μέρα (π.χ. ανδρών + γυναικών). Δεν είναι υποχρεωτικό."),
        numbered("Αποθήκευση."),
        h("10.2 Φίλτρα κατηγορίας", 3),
        table(
            ["Φίλτρο", "Τι κάνει", "Κενό σημαίνει"],
            [
                ["Φύλο", "Άνδρες / Γυναίκες / Μικτό", "Υποχρεωτικό. Μικτό = άντρας+γυναίκα vs άντρας+γυναίκα"],
                ["Ελάχιστη / μέγιστη ηλικία", "Από έτος γέννησης", "Χωρίς όριο ηλικίας"],
                ["Ζώνη επιπέδου", "C / B / A του club, ή αριθμοί min–max", "Όλα τα επίπεδα"],
            ],
        ),
        p("Απόρριψη εγγραφής είναι συγκεκριμένη: όνομα + λόγος («Η Ελένη είναι γυναίκα. Η κατηγορία Ανδρών δέχεται μόνο άνδρες»). Χωρίς φύλο στο προφίλ: από τη λίστα βάζεις φύλο και γράφεις."),
        p("Μετά το πρώτο σκορ οι εγγραφές κλειδώνουν. Αλλαγή πριν το σκορ: αφαίρεσε παίκτη, πρόσθεσε άλλον. Άγραφος γύρος σβήνεται."),
        h("10.3 Preset και μέτρηση", 3),
        p("Κάθε preset έχει format + scoring. Το club τα ορίζει στις ρυθμίσεις (πιο πλήρεις στο κινητό)."),
        table(
            ["Είδος μέτρησης", "Επιλογές"],
            [
                ["Επίσημο (FIP)", "Deuce: advantage / golden point / star point. Set: 6+TB ή mini-4. Ματς: 1 set, Bo3, Bo3+super TB 10, Bo3+TB 7"],
                ["Σταθεροί πόντοι", "16 / 21 / 24 / 32 — κοινωνικό Mexicano / Americano"],
                ["Χρόνος", "8–15 λεπτά"],
                ["KOTC race", "Πρώτος στους 4, 5 ή 7 πόντους"],
            ],
        ),
        p("Παραδείγματα preset: Βραδιά Mexicano 24 · King of the Court race 5 · Σαββατοκύριακο σταθερά ζευγάρια (knockout) · Mini-sets όμιλοι+KO · Ένα set golden point."),
        h("11. Τι είναι κάθε format και πώς παίζεται", 2),
        h("11.1 Mexicano", 3),
        p("Κοινωνικό. Οι παίκτες μπαίνουν ως άτομα. Κάθε γύρος φτιάχνονται τετράδες με βάση τη βαθμολογία (πόντοι που έχουν μαζέψει). Δεν μένουν τα ίδια ζευγάρια."),
        numbered("Γράψε τουλάχιστον 4 παίκτες στην κατηγορία."),
        numbered("Νέος γύρος. Παίζονται τα ματς, βάζεις σκορ."),
        numbered("Νέος γύρος μόνο αφού έχουν σκορ όλα τα ματς του τρέχοντος."),
        numbered("5+ παίκτες: ο ένας κάθεται. Στον επόμενο διαλέγεις εσύ ποιον αντικαθιστά (κουμπί στο ζευγάρι)."),
        numbered("Δεν υπάρχει όριο γύρων. Όταν τελειώσει η ώρα, Κλείσιμο ματς — όχι «Κλειστό» όλο το τουρνουά."),
        numbered("Αν παίζουν δύο γήπεδα, κλείσε το ματς που σταμάτησε."),
        h("11.2 Americano", 3),
        p("Όπως το Mexicano στη ροή (σκορ, πέμπτος, κλείσιμο), αλλά ο επόμενος γύρος αποφεύγει τα ίδια ζευγάρια όσο γίνεται. Νέοι παρτενέρ."),
        h("11.3 Knockout", 3),
        p("Σταθερά ζευγάρια από την αρχή. Ταμπλό. Ο νικητής προχωρά. Χωρίς ισοπαλία. Αν τα ζευγάρια δεν είναι δύναμη του 2, μερικά παίρνουν bye (περνούν χωρίς αγώνα — το βάζει το σύστημα, όχι εσύ)."),
        numbered("Ζυγός αριθμός παικτών ώστε να βγουν ζευγάρια."),
        numbered("Άνοιγμα ταμπλό."),
        numbered("Σκορ. Επόμενος γύρος (προημιτελικός / ημιτελικός / τελικός)."),
        numbered("Ο νικητής του τελικού είναι το ζευγάρι του τουρνουά."),
        h("11.4 Όμιλοι + knockout", 3),
        p("Σταθερά ζευγάρια. Μπαίνουν σε ομίλους των 3–4 (ποτέ 2). Round robin μέσα στον όμιλο. Οι δύο πρώτοι κάθε ομίλου πάνε στο ταμπλό. Χρειάζονται τουλάχιστον 6 παίκτες (3 ζευγάρια)."),
        numbered("Άνοιγμα ομίλων — φαίνονται οι πίνακες."),
        numbered("Επόμενη ημέρα ομίλων μέχρι να τελειώσουν τα ματς."),
        numbered("Άνοιγμα knockout. Μετά όπως το ταμπλό."),
        note("Στα preset το όνομα μπορεί να λέει «Mini-sets». Το format είναι όμιλοι+KO."),
        h("11.5 King of the Court", 3),
        p("Σταθερά ζευγάρια. Τα γήπεδα είναι σκάλα: King (πάνω), Queen, Γήπεδο 3… Νικητές ένα γήπεδο πάνω, ηττημένοι ένα κάτω. Στο King οι νικητές μένουν. Χωρίς ισοπαλία. Race συνήθως στους 5."),
        table(
            ["Παίκτες", "Τι γίνεται"],
            [
                ["4", "Ένα King. Ξαναπαίζουν."],
                ["6", "King + ζευγάρι που περιμένει. Μετά τον αγώνα μπαίνουν αυτοί, οι ηττημένοι κάθονται."],
                ["8", "King + Queen. Οι νικητές της Queen ανεβαίνουν."],
                ["5", "Ο ένας κάθεται. Στον επόμενο διαλέγεις ποιον αντικαθιστά."],
            ],
        ),
        p("Δεν έχει όριο γύρων. Κλείσιμο ματς όταν τελειώσει η ώρα."),
        h("12. Οθόνη κατηγορίας (desk) — στήσιμο αγώνων τουρνουά", 2),
        p("Άνοιξε τουρνουά → κατηγορία. Αυτή είναι η κύρια οθόνη ημέρας τουρνουά."),
        bullet("Εγγραφές: αναζήτηση με κουμπί, εγγραφή, αφαίρεση (μέχρι να μπει σκορ)."),
        bullet("Υπόδειξη format (knockout / όμιλοι / KOTC)."),
        bullet("Βαθμολογία (Mexicano / Americano / KOTC) ή πίνακες ομίλων."),
        bullet("Νέος γύρος / Άνοιγμα ταμπλό / Άνοιγμα ομίλων — ανάλογα το format."),
        bullet("Σκορ: δύο ακέραιοι + Σκορ. Στο knockout και KOTC δεν γίνεται ισοπαλία."),
        bullet("Κλείσιμο ματς στον τελευταίο γύρο των κοινωνικών format."),
        p("Το μεγάλο «Κλειστό» πάνω στο τουρνουά κλείνει όλη τη διοργάνωση. Για να σταματήσει ένα γήπεδο, κλείσε το ματς."),
        h("13. Ζευγάρια ίσης δύναμης (καθημερινό, όχι τουρνουά)", 2),
        p("Στο κινητό, σε γεμάτο σλοτ 4 παικτών, το προσωπικό μπορεί να προτείνει ζευγάρια (snake ή Mexicano, από ρυθμίσεις). Snake: δυνατός με αδύναμο. Mexicano: με βάση βαθμολογία. Αν επιτρέπεται override, η ρεσεψιόν αλλάζει ζευγάρια πριν τη σέντρα. Στο καθημερινό δεν μπαίνει φίλτρο φύλου."),
        h("14. Ρυθμίσεις desk", 2),
        p("Συνοπτικές στο web: όνομα club, χρώμα, προεπιλεγμένη διάρκεια σλοτ, ώρες ακύρωσης πριν το ματς, ± επίπεδο open match, λίστα αναμονής, admin override ζευγαριών. Οι πλήρεις ρυθμίσεις (presets, ζώνες, pairing) είναι στην εφαρμογή, tab Ρυθμίσεις, για owner / ρεσεψιόν."),
        h("15. Εφαρμογή κινητού / iPad", 2),
        h("15.1 Εγγραφή και είσοδος παίκτη", 3),
        numbered("Κατέβασε την εφαρμογή. Πρώτη φορά: Εγγραφή (όνομα, email, κωδικός, club)."),
        numbered("Αν η ρεσεψιόν έχει ήδη καρτέλα με το ίδιο email, δένεται εκεί."),
        numbered("Επόμενες φορές: Σύνδεση με club + email + κωδικό."),
        numbered("Προχωρημένο: διεύθυνση server, μόνο αν στο club σου το έχουν πει. Στο Store δεν είναι προ-γεμισμένο."),
        p("Staff δεν αυτο-εγγράφεται ως owner. Τους λογαριασμούς τους ανοίγει το club."),
        h("15.2 Tab παίκτη", 3),
        table(
            ["Tab", "Τι κάνει ο παίκτης"],
            [
                ["Αρχική", "Χαιρετισμός, club, σύνδεσμοι σε ημερολόγιο / open match / τουρνουά / προφίλ"],
                ["Γήπεδα", "Βλέπει ονόματα και ωράρια. Δεν επεξεργάζεται"],
                ["Ημερολόγιο", "Ημέρα, διάρκεια, κλικ σε σλοτ για κράτηση"],
                ["Προφίλ", "Η δική του καρτέλα (όχι λίστα όλων των παικτών)"],
                ["Περισσότερα", "Γλώσσα, τουρνουά, open match, αποσύνδεση"],
            ],
        ),
        p("Δεν υπάρχει tab Ρυθμίσεις για παίκτη."),
        h("15.3 Πώς κλείνει γήπεδο ο παίκτης", 3),
        numbered("Ημερολόγιο → διάλεξε μέρα και διάρκεια."),
        numbered("Πράσινο = ελεύθερο, κεχριμπάρι = ψάχνουν παίκτες, γεμάτο = κλεισμένο."),
        numbered("Κλικ στο σλοτ. Βάζεις 1–4 ονόματα (εσένα και συμπαίκτες από αναζήτηση club ή νέο όνομα)."),
        numbered("Κράτηση. Αν λείπουν θέσεις, είναι open match — άλλοι μπορούν να μπουν αν ταιριάζει το ± επίπεδο."),
        numbered("Ακύρωση της δικής σου κράτησης, μέσα στον κανόνα ωρών του club."),
        numbered("Αν η λίστα αναμονής είναι ανοιχτή και το σλοτ γεμάτο, μπορείς να μπεις σε αναμονή."),
        h("15.4 Open match", 3),
        p("Λίστα τετράδων που ψάχνουν 1 ή 2 παίκτες, μέσα στο ± επίπεδο που ορίζει το club. Μπαίνεις αν χωράς. Δεν υπάρχει φίλτρο φύλου στο καθημερινό open match."),
        h("15.5 Τουρνουά στο κινητό (παίκτης)", 3),
        p("Περισσότερα → Τουρνουά. Βλέπει λίστα, λεπτομέρεια, κατηγορία, εγγραφές, σκορ, βαθμολογία. Μπορεί να γραφτεί ο ίδιος αν η κατηγορία τον δέχεται. Δεν δημιουργεί τουρνουά, δεν ανοίγει γύρο, δεν βάζει σκορ, δεν αλλάζει κατάσταση."),
        h("15.6 Owner / ρεσεψιόν στο κινητό", 3),
        p("Ίδια credentials. Επιπλέον: tab Ρυθμίσεις (brand, σλοτ, ακύρωση, επίπεδα, open match, pairing, presets, διακόπτες), λίστα παικτών, επεξεργασία γηπέδων, δημιουργία τουρνουά, εγγραφές άλλων, νέος γύρος, σκορ, κλείσιμο ματς. Στο iPad το ημερολόγιο γίνεται στήλες όταν η οθόνη είναι φαρδιά."),
        h("15.7 Προπονητής στο κινητό", 3),
        p("Σκορ τουρνουά, ζευγάρια σε σλοτ, επίπεδα παικτών. Όχι presets / ρυθμίσεις club, όχι Νέο τουρνουά."),
        h("16. Καταστάσεις τουρνουά", 2),
        table(
            ["Κατάσταση", "Σημαίνει"],
            [
                ["Πρόχειρο", "Το φτιάξατε, δεν «τρέχει» ακόμα δημόσια."],
                ["Ανοιχτό", "Δέχεται εγγραφές."],
                ["Σε εξέλιξη", "Έχουν ανοίξει γύροι."],
                ["Κλειστό", "Τελείωσε όλη η διοργάνωση."],
            ],
        ),
        h("17. Τι δεν υπάρχει σε αυτό το version", 2),
        bullet("Wallet, πληρωμές, μαθήματα, Excel — σημειωμένα για αργότερα."),
        bullet("Round robin και box league ως ξεχωριστές μηχανές."),
        bullet("Εθνικό tour / κοινό ranking Ελλάδας."),
        bullet("WhatsApp, QR, TV, δυναμική τιμή."),
        h("18. Γρήγορη λίστα ημέρας γραμματείας", 2),
        numbered("Πρόγραμμα: κλείσε τα σταθερά ματς."),
        numbered("Άνοιξε τουρνουά της ημέρας, γράψε παίκτες στις κατηγορίες."),
        numbered("Νέος γύρος / ταμπλό / όμιλοι. Βάλε σκορ."),
        numbered("Πέμπτος: διάλεξε ποιον κάθεται."),
        numbered("Τέλος ώρας: Κλείσιμο ματς. Στο τέλος της διοργάνωσης: κατάσταση Κλειστό."),
    ]
    return "".join(bits)


def english() -> str:
    bits = [
        h("1. What PadelApp is", 2),
        p("PadelApp is the operating system for one padel club: court bookings, players and levels, open matches, equal-strength pairing, and in-club tournaments. It is not a marketplace, not a national championship, and there is no shared ranking across clubs."),
        p("Two doors for the customer, one API we host in the European Union: the web desk on reception’s laptop and the player’s phone. Staff can open the same app on court if needed."),
        bullet("Desk: browser — staff only. One URL for every club."),
        bullet("Phone: one app on the App Store and Google Play (com.padelapp.app)."),
        bullet("API + database: in an EU data center we operate. Backups and 24/7 are ours. No customer VPS."),
        h("2. Roles and permissions", 2),
        table(
            ["Role", "Web desk", "Mobile"],
            [
                ["Owner / reception", "Everything: calendar, bookings, players, courts, settings, tournaments", "The same work as the desk, same login"],
                ["Coach", "Calendar, levels, scores, pairings", "Scores and pairings on court. No tournament create, no club settings"],
                ["Player", "Blocked. Opening the desk shows a refusal", "Book a court, open match, own profile. View tournaments and scores. Cannot create a tournament"],
            ],
        ),
        p("Owner and reception are “admin”. Players register themselves in the app. Staff accounts are created by the club."),
        h("3. Languages", 2),
        p("Greek and English from the first screen. Desk: EL / EN top right. Phone: language toggle on login and in More. The app also follows the device language."),
        h("4. Web desk — sign-in and navigation", 2),
        h("4.1 Sign-in", 3),
        numbered("Open the club’s desk URL."),
        numbered("Pick the club (when more than one exists in a test setup)."),
        numbered("Staff email and password."),
        numbered("Sign in. A player account is rejected here and told to use the mobile app."),
        p("On a wide screen the left side is the desk message; the form is on the right."),
        h("4.2 Top navigation", 3),
        p("Dark bar: club name, role, language, sign out. Tabs underneath:"),
        bullet("Dashboard — today’s snapshot."),
        bullet("Schedule — courts as columns."),
        bullet("Bookings — list for the day."),
        bullet("Players — club cards."),
        bullet("Courts — indoor / outdoor, hours, maintenance."),
        bullet("Tournaments — club events."),
        bullet("Settings — owner and reception only."),
        h("5. Dashboard", 2),
        p("Numbers for this club only (not a national ranking): bookings today, open matches (missing 1 or 2), player count, court count, day occupancy, tournament count. The tiles are white, with no colour fill. Revenue / wallet is not in this version."),
        h("6. Schedule (desk calendar)", 2),
        p("Courts as columns, time on the left. Pick a date and a slot length from the club templates (e.g. 60 / 90 / 120 minutes)."),
        h("Slot colours", 3),
        table(
            ["State", "Meaning"],
            [
                ["Available", "Empty. Click to book."],
                ["Open", "A booking exists but 1 or 2 players are missing."],
                ["Full", "Four players booked."],
                ["Maintenance", "The court does not take a booking at that time."],
            ],
        ),
        h("How to book a match from the desk", 3),
        numbered("Go to Schedule. Pick a day. The grid is 09:30–23:00 every 30 minutes."),
        numbered("Match length (60/90/120) is how long they play — it does not change the timetable."),
        numbered("Search players at the top (optional, up to 4). Empty = hold the court without a team (lime)."),
        numbered("Click an empty slot. 1–3 names = open (amber). 4 = full."),
        numbered("Cancel from the same slot. The club’s hours-before rule applies."),
        note("Official padel is 4 on court. In a tournament with 5+ players, one sits out — you do not add a fifth onto a scored 4-player match."),
        h("7. Bookings", 2),
        p("Day list: time, duration, court, names, type (Match = 4 players, Open = missing 1/2). Change day with the arrows. This is not a cash register."),
        h("8. Players (desk)", 2),
        p("Club directory. Levels are ours (1.0–7.0 and bands C / B / A), not national tour points."),
        h("List", 3),
        p("Search after you press the button. Empty search + button = full list. Click a row for the card."),
        h("New / edit", 3),
        bullet("Name, phone, email."),
        bullet("Gender: male / female. Without gender they cannot enter a tournament category."),
        bullet("Birth year — age is computed from that."),
        bullet("Self level and confirmed level. Confirmation is done by coach or admin, as the club configured."),
        p("Elo: after the first score of a tournament match, the confirmed level moves a little. Beating a stronger player moves it more. It is not an acronym — it is Árpád Élő’s system. It never leaves the club."),
        p("GDPR: reception can fully erase a player. The owner cannot be erased from that button."),
        h("9. Courts (desk)", 2),
        p("Court list. New / edit: name, indoor or outdoor, open / close time, sort order, maintenance until a date. Players see hours on the phone; they cannot edit courts."),
        h("10. Tournaments — creating one", 2),
        p("A tournament is a club event with a preset (format + scoring) and one or more categories."),
        h("10.1 New tournament form", 3),
        numbered("Tournaments → New tournament."),
        numbered("Name (e.g. “Friday night”)."),
        numbered("Date."),
        numbered("Club preset — this sets format and scoring."),
        numbered("Category 1: name, gender, optional age and level."),
        numbered("Add a category only if you want a second draw the same day (e.g. men + women). It is optional."),
        numbered("Save."),
        h("10.2 Category filters", 3),
        table(
            ["Filter", "What it does", "Empty means"],
            [
                ["Gender", "Men / Women / Mixed", "Required. Mixed = man+woman vs man+woman"],
                ["Min / max age", "From birth year", "No age limit"],
                ["Level band", "Club C / B / A, or numeric min–max", "All levels"],
            ],
        ),
        p("Entry rejection is specific: name + reason (“Eleni is female. The Men category only accepts men.”). Missing gender: set it from the search list and then enter them."),
        p("After the first score, entries lock. To swap before a score: remove one, add another. An unscored round is cleared."),
        h("10.3 Presets and scoring", 3),
        p("Each preset is format + scoring. The club edits them in settings (full editor on mobile)."),
        table(
            ["Scoring kind", "Options"],
            [
                ["Official (FIP)", "Deuce: advantage / golden point / star point. Set: 6+TB or mini-4. Match: one set, Bo3, Bo3+super TB 10, Bo3+TB 7"],
                ["Fixed points", "16 / 21 / 24 / 32 — social Mexicano / Americano"],
                ["Timed", "8–15 minutes"],
                ["KOTC race", "First to 4, 5 or 7"],
            ],
        ),
        p("Example presets: Evening Mexicano 24 · King of the Court race 5 · Weekend fixed pairs (knockout) · Mini-sets groups+KO · One set golden point."),
        h("11. What each format is and how you run it", 2),
        h("11.1 Mexicano", 3),
        p("Social. Players enter as individuals. Each round builds foursomes from live standings (points scored). Partners do not stay together."),
        numbered("Enter at least 4 players in the category."),
        numbered("New round. Play, enter scores."),
        numbered("A new round only after every match in the current round has a score."),
        numbered("5+ players: one sits out. On the next round you pick who they replace (button on that pair)."),
        numbered("No round cap. When time is up, Close match — do not press Closed on the whole tournament."),
        numbered("If two matches are on, close the one that stopped."),
        h("11.2 Americano", 3),
        p("Same flow as Mexicano (score, fifth player, close), but the next round avoids repeating partners when it can."),
        h("11.3 Knockout", 3),
        p("Fixed pairs from the start. Bracket. Winner advances. No draws. If the field is not a power of two, some pairs get a bye (they advance without playing — the system assigns it, you do not pick it)."),
        numbered("Even number of players so pairs can form."),
        numbered("Open the bracket."),
        numbered("Score. Next round (quarters / semis / final)."),
        numbered("The final winners are the tournament winners."),
        h("11.4 Groups + knockout", 3),
        p("Fixed pairs. Groups of 3–4 (never 2). Round robin inside the group. The top two in each group go to the bracket. Needs at least 6 players (3 pairs)."),
        numbered("Open the groups — tables appear."),
        numbered("Next group matchday until the group fixtures are done."),
        numbered("Open the knockout. Then it behaves like a bracket."),
        note("The preset name may say “Mini-sets”. The format is groups+KO."),
        h("11.5 King of the Court", 3),
        p("Fixed pairs. Courts are a ladder: King (top), Queen, Court 3… Winners move one court up, losers one down. King winners stay. No draws. Usually race to 5."),
        table(
            ["Players", "What happens"],
            [
                ["4", "One King court. They play again."],
                ["6", "King + a waiting pair. After the game the waiters come on, losers sit."],
                ["8", "King + Queen. Queen winners move up."],
                ["5", "One sits. Next round you pick who they replace."],
            ],
        ),
        p("No round cap. Close the match when time is up."),
        h("12. Category screen (desk) — running tournament matches", 2),
        p("Open a tournament → a category. This is the main match-day screen."),
        bullet("Entries: search after the button, register, remove (until a score is in)."),
        bullet("Format hint (knockout / groups / KOTC)."),
        bullet("Standings (Mexicano / Americano / KOTC) or group tables."),
        bullet("New round / Open bracket / Open groups — depends on format."),
        bullet("Score: two whole numbers + Score. Knockout and KOTC reject draws."),
        bullet("Close match on the last social round."),
        p("Closed on the tournament header ends the whole event. To stop one court, close that match."),
        h("13. Equal-strength pairing (daily, not a tournament)", 2),
        p("On the phone, on a full 4-player slot, staff can propose pairs (snake or Mexicano, from settings). Snake: strong with weak. Mexicano: by standings. If override is on, reception can change pairs before play. Daily pairing does not filter by gender."),
        h("14. Desk settings", 2),
        p("Short form on the web: club name, colour, default slot length, cancel-hours rule, open-match ± level, waitlist, admin pair override. The full settings (presets, bands, pairing) live in the app Settings tab for owner / reception."),
        h("15. Mobile / iPad app", 2),
        h("15.1 Player registration and login", 3),
        numbered("Install the app. First time: Register (name, email, password, club)."),
        numbered("If reception already has a card with that email, it is linked."),
        numbered("Later visits: Sign in with club + email + password."),
        numbered("Advanced: server URL, only if the club told you to set it. The Store build does not prefill a dev server."),
        p("Staff do not self-register as owner. The club creates those accounts."),
        h("15.2 Player tabs", 3),
        table(
            ["Tab", "What the player does"],
            [
                ["Home", "Greeting, club, links to calendar / open match / tournaments / profile"],
                ["Courts", "Names and hours. No editing"],
                ["Calendar", "Day, duration, tap a slot to book"],
                ["Profile", "Their own card (not the full player directory)"],
                ["More", "Language, tournaments, open match, sign out"],
            ],
        ),
        p("Players do not see a Settings tab."),
        h("15.3 How a player books a court", 3),
        numbered("Calendar → pick day and duration."),
        numbered("Green = free, amber = looking for players, full = booked."),
        numbered("Tap the slot. Add 1–4 names (yourself plus club search or a new name)."),
        numbered("Book. Missing spots make it an open match — others can join if they fit ± level."),
        numbered("Cancel your own booking within the club’s hours rule."),
        numbered("If waitlist is on and the slot is full, they can join the waitlist."),
        h("15.4 Open match", 3),
        p("A list of fours looking for 1 or 2 players, inside the club’s ± level. You join if you fit. There is no gender filter on daily open match."),
        h("15.5 Tournaments on the phone (player)", 3),
        p("More → Tournaments. They see the list, detail, category, entries, scores, standings. They can enter themselves if the category accepts them. They cannot create a tournament, open a round, enter a score, or change status."),
        h("15.6 Owner / reception on the phone", 3),
        p("Same credentials. Extra: Settings tab (brand, slots, cancel rule, levels, open match, pairing, presets, feature flags), player directory, court edit, create tournament, enter other players, new round, score, close match. On iPad the calendar becomes columns on a wide screen."),
        h("15.7 Coach on the phone", 3),
        p("Tournament scores, slot pairings, player levels. No club presets / settings, no New tournament."),
        h("16. Tournament statuses", 2),
        table(
            ["Status", "Meaning"],
            [
                ["Draft", "Created, not running publicly yet."],
                ["Open", "Accepting entries."],
                ["Running", "Rounds have been opened."],
                ["Closed", "The whole event is finished."],
            ],
        ),
        h("17. Not in this version", 2),
        bullet("Wallet, payments, lessons, Excel — noted for later."),
        bullet("Round robin and box league as full engines."),
        bullet("National tour / Greece-wide ranking."),
        bullet("WhatsApp, QR, TV, dynamic pricing."),
        h("18. Reception day checklist", 2),
        numbered("Schedule: book the fixed matches."),
        numbered("Open today’s tournament, enter players in categories."),
        numbered("New round / bracket / groups. Enter scores."),
        numbered("Fifth player: pick who sits out."),
        numbered("When time is up: Close match. When the event is over: status Closed."),
    ]
    return "".join(bits)


def cover_el() -> str:
    return "".join(
        [
            para(t_fmt("PadelApp", bold=True, size=56, color="06241B"), after=80),
            para(t_fmt("Εγχειρίδιο χρήσης", bold=True, size=36, color="0F8A58"), after=240),
            p("Web desk + εφαρμογή κινητού / iPad"),
            p("Έκδοση v1 — Σεπτέμβριος 2026"),
            note(
                "Αυτό είναι εγχειρίδιο λειτουργίας του club. Δεν είναι εθνικό πρωτάθλημα. Τα δεδομένα μένουν στην εγκατάσταση του πελάτη."
            ),
            page_break(),
        ]
    )


def cover_en() -> str:
    return "".join(
        [
            para(t_fmt("PadelApp", bold=True, size=56, color="06241B"), after=80),
            para(t_fmt("User manual", bold=True, size=36, color="0F8A58"), after=240),
            p("Web desk + mobile / iPad app"),
            p("Version v1 — September 2026"),
            note(
                "This is the club operations manual. It is not a national tour. Data stays on the customer’s installation."
            ),
            page_break(),
        ]
    )


CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>
"""

RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>
"""

DOC_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>
"""

STYLES = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles {NS}>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/>
    <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/>
    <w:pPr><w:outlineLvl w:val="1"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:qFormat/>
    <w:pPr><w:outlineLvl w:val="2"/></w:pPr>
  </w:style>
</w:styles>
"""

NUMBERING = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering {NS}>
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="420" w:hanging="220"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="420" w:hanging="220"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>
"""

def core_xml(title: str, description: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>{escape(title)}</dc:title>
  <dc:creator>PadelApp</dc:creator>
  <dc:description>{escape(description)}</dc:description>
</cp:coreProperties>
"""


def document_xml(body: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document {NS}>
  <w:body>
    {body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567"/>
    </w:sectPr>
  </w:body>
</w:document>
"""


def write_docx(path: Path, body: str, title: str, description: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES)
        zf.writestr("_rels/.rels", RELS)
        zf.writestr("docProps/core.xml", core_xml(title, description))
        zf.writestr("word/_rels/document.xml.rels", DOC_RELS)
        zf.writestr("word/styles.xml", STYLES)
        zf.writestr("word/numbering.xml", NUMBERING)
        zf.writestr("word/document.xml", document_xml(body))
    print(f"Wrote {path} ({path.stat().st_size} bytes)")


def main() -> None:
    write_docx(
        OUT_EL,
        cover_el() + greek(),
        "PadelApp — εγχειρίδιο χρήσης",
        "Εγχειρίδιο λειτουργίας web desk και εφαρμογής κινητού / iPad.",
    )
    write_docx(
        OUT_EN,
        cover_en() + english(),
        "PadelApp — user manual",
        "Operations manual for the web desk and the mobile / iPad app.",
    )
    old = ROOT / "docs" / "PadelApp-manual-el-en.docx"
    if old.exists():
        old.unlink()
        print(f"Removed {old}")


if __name__ == "__main__":
    main()
