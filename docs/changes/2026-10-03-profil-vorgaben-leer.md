# 2026-10-03-profil-vorgaben-leer

## Problem
Wer die App zum ersten Mal öffnete, sah in den Einstellungen den Namen,
die Mailadresse und die Website des Entwicklers als Vorgabe. Die Vorgaben
sollen leer sein: im Namensfeld steht der Platzhalter „Dein Name“, unter
„Persönliche Daten“ steht bei E-Mail und Website „Hinzufügen“.

## Änderung
- `src/data/account.js`: `name`, `mail` und die Adresse des Website-Links
  sind leer. Kommentar-Header und die Beispielnamen in den Kommentaren
  angepasst.
- `src/features/profile/profile-cards.js`: Die Mailzeile im Kopf der
  Einstellungen erscheint nur, wenn eine Mailadresse da ist. Sonst stünde
  dort ein leerer Absatz.
- `src/features/profile/profile-name.js`: Nur der Kommentar. Ein geleertes
  Namensfeld zeigt wieder den Platzhalter, statt auf eine Vorgabe
  zurückzufallen.
- `src/data/version.js`: neuer Versionsstempel.

## Begründung
Platzhalter („Dein Name“, Stil in `styles/profile.css`) und der Text
„Hinzufügen“ für leere Werte (`copyRow` in
`src/features/profile/account.js`) waren schon angelegt; es fehlte nur die
leere Vorgabe. Verworfen: E-Mail und Website unter „Persönliche Daten“
tatsächlich tippbar zu machen. Das ist ein eigenes Feature, wie beim
Telefon-Eintrag bleibt „Hinzufügen“ vorerst nur Anzeige.

## Visualisierung
Vorher:
```
Einstellungen                   Persönliche Daten
┌──────────────────────┐         Name     Paul Angeles  ⧉
│ (PA)  Paul Angeles   │         E-Mail   paul@para…    ⧉
│       Dabei seit …   │         Telefon  Hinzufügen
└──────────────────────┘         Website  paralist.app  ⧉
```

Nachher:
```
Einstellungen                   Persönliche Daten
┌──────────────────────┐         Name     Hinzufügen
│ ( ? )  Dein Name     │         E-Mail   Hinzufügen
│        Dabei seit …  │         Telefon  Hinzufügen
└──────────────────────┘         Website  Hinzufügen
```
„Dein Name“ steht blass im Feld; beim Tippen ziehen die Initialen im Bild
sofort mit, ein geleertes Feld zeigt wieder den Platzhalter.

## Hinweise
- Wer schon einen Namen eingetippt hat, behält ihn (Browser-Speicher
  bleibt unberührt).
- Ohne Namen steht „?“ im runden Bild (`fallbackInitials`).
- Geprüft bei 375 px, hell und dunkel, leerer Speicher, Konsole leer:
  erstes Öffnen, Name tippen, Feld leeren, Seite „Persönliche Daten“.
- Antippen von „Hinzufügen“ bei E-Mail/Website tut noch nichts.
