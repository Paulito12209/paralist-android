# Paralist — Android-Fassung (Web)

Die Android-Fassung der App **Paralist** als Web-App: nur das Handy, keine
Desktop- und keine iOS-Fassung. Sie ist die Vorlage für die spätere
**native Android-App** und läuft vom eigenen Webspace direkt auf dem Handy.
Kein Build-Schritt, keine Abhängigkeiten: die App läuft als ES-Module direkt
im Browser.

## Auf dem Handy öffnen

Die App liegt auf dem eigenen Webspace (Hostinger) in einem eigenen
Verzeichnis und ist über dessen Adresse erreichbar. Im Chrome auf dem
Android-Handy öffnen und über das Menü „Zum Startbildschirm hinzufügen“ —
dann startet sie wie eine App, ohne Browserleiste (`manifest.webmanifest`).
Eine offene App merkt beim nächsten Öffnen, dass es eine neue Fassung gibt,
und bietet das Aktualisieren an (`src/shell/update-prompt.js`).

## Veröffentlichen

```bash
python3 tools/deploy.py
```

Das Skript macht, was man sonst in FileZilla von Hand tut: es schreibt den
Versionsstempel frisch, prüft die Projektregeln, löscht auf dem Server alles,
was nicht mehr zur App gehört, und lädt alle geänderten Dateien hoch
(`index.html`, `manifest.webmanifest`, `.htaccess`, `assets/`, `src/`,
`styles/`). `--dry-run` zeigt nur, was passieren würde; `--all` lädt alles
neu. Die Zugangsdaten liegen außerhalb des Repositories in
`~/.config/paralist-android/deploy.env` (Aufbau oben in `tools/deploy.py`).

Automatisch bei jedem Push auf `main`: einmal `git config core.hooksPath
.githooks` ausführen, dann lädt `.githooks/pre-push` vor dem Push hoch.
Schlägt das Hochladen fehl, wird auch nicht gepusht.

## Lokal starten

```bash
python3 tools/serve.py
```

Dann `http://localhost:4173` öffnen. Am besten in der Handy-Ansicht bei 375 px
Breite — dafür ist das Layout gemacht. Auf einem echten Handy (Touch) füllt die
App den ganzen Bildschirm, im Desktop-Browser steht sie in einem Geräterahmen.

Zum Zurücksetzen auf die Beispieldaten in der Browser-Konsole:

```js
localStorage.clear()
```

`tools/serve.py` verbietet das Zwischenspeichern; mit `python3 -m http.server`
zeigt Chrome nach einer Änderung womöglich noch den alten Stand — dann einmal
hart neu laden (Shift + Reload).

## Aufbau

```
index.html                  Gerüst: nur Markup
manifest.webmanifest        Angaben für „Zum Startbildschirm hinzufügen“
assets/icons/               sprite.svg (alle Icons) und die App-Icons
styles/                     Stile, je Bereich eine Datei
src/                        die App, in kleine Module geteilt
tools/check.py              prüft die Projektregeln (Zeilengrenze, Struktur, Kommentare)
tools/version.py            schreibt den Versionsstempel src/data/version.js (für das Update-Fenster)
tools/serve.py              Entwicklungsserver ohne Zwischenspeicher
tools/deploy.py             lädt die App per FTP auf den Webspace (Hostinger)
.htaccess                   Apache-Regeln auf dem Webspace: Manifest-Typ, version.js ohne Zwischenspeicher
.githooks/pre-push          lädt beim Push von main automatisch hoch
docs/flows.md               die Wege, die nach einer Änderung durchzuklicken sind
docs/android-flows.md       was die Android-Fassung dabei eigens macht
CLAUDE.md                   Kurzregeln für die Arbeit am Projekt
.claude/skills/…/SKILL.md   die vollständigen Regeln
```

Die Android-Fassung liegt als eigene Stil-Schicht über den Grundseiten:
`<html>` trägt fest `data-mobile-os="android"`, und die `styles/android-*.css`
(nach den Seiten geladen) überschreiben damit deren Regeln. Unter
Einstellungen › Mehr › Versionen lässt sich zusätzlich „Android (Experiment)“
wählen (`data-mobile-variant="experiment"` an `<html>`); dort sammeln sich die
Versuche, siehe `src/data/platform-versions.js`.

### Wo liegt was?

| Ordner | Aufgabe | Darf nicht |
| --- | --- | --- |
| `src/core/` | Werkzeuge ohne App-Wissen: DOM-Zugriff, Datum, Formate, Speicher, Nachrichten, Nachladen | nichts über die App wissen |
| `src/data/` | Zustand, Abfragen, Änderungen, Punkte, Nutzungszeit, Beispieldaten | das DOM anfassen |
| `src/ui/` | wiederverwendete Bausteine: Zeilen, Blätter, Menüs, Wischen, Tippen zum Schreiben, Diagramm-Gerüst, Router | einzelne Seiten kennen |
| `src/features/` | je Seite ein Ordner: `overview`, `calendar`, `tasks`, `media`, `resources`, `composer`, `entry`, `drawing`, `progress`, `profile`, `search` | sich gegenseitig importieren (stattdessen `core/bus.js`) |
| `src/shell/` | Kopfzeile, Navigationsleiste, Suchfeld, Tastatur-Höhe, Schreiben auf der Seite (Leiste weicht), Icon-Sammlung | — |

Importe zeigen immer nur in eine Richtung:
`main.js → shell|features → ui → data → core`. Zwei Seiten importieren sich
nie gegenseitig. Stattdessen:

- **Nachrichten:** wer Daten ändert, ruft `emit(events.dataChanged)`, und jeder
  Bereich zeichnet sich selbst neu — **aber nur, wenn seine Seite gerade
  sichtbar ist**. So bittet auch der Kalender mit `events.composerRequested` um
  das Eingabefeld, ohne es zu kennen.
- **Hereingeben:** braucht eine untere Schicht etwas von einer oberen, bekommt
  sie es beim Start übergeben — `initListClicks({ openTabMenu, … })`,
  `registerLoader(name, importFn)`, `registerOverlay(name, { open, hide })`.
  `src/main.js` ist die einzige Datei, die alle Bereiche kennt.

Dass all das stimmt, prüft `python3 tools/check.py`.

### Wo ändere ich das Aussehen?

Die Werte, die auf jeder Seite wirken — die Grundfarben, die Maße der
Bedienelemente, die wiederkehrenden Abstände —, stehen in
**`styles/tokens.css`**. Was nur eine einzelne Seite betrifft (Kalender,
Aufgaben, Medien, Suche, Zeichnung, Profil, Einstellungen), steht in
**`styles/tokens-pages.css`**. Oben in `tokens.css` steht auch, welche Stil-Datei
welchen Bereich abdeckt.

Die Schriftgröße eines einzelnen Elements (die Stundenbeschriftung im Kalender,
eine Überschrift im Profil-Blatt) steht dagegen direkt bei ihrer Regel in der
Datei des Bereichs. Jede Datei — auch jede JavaScript-Datei — beginnt darum mit
einem Kommentarblock, der ihre anpassbaren Werte in Alltagssprache auflistet.
Der richtige Weg ist also: in `styles/tokens.css` nachsehen, welche Datei den
Bereich abdeckt, und dann deren Kopfkommentar lesen.

## Datenmodell

Drei Ebenen, eine Liste von Verweisen:

```
Tab
 └─ Arbeitsbereich          { id, name, tab, icon, favorite, body }
     └─ Projekt (Eintrag)   { id, type: "projekt", title, body, places: ["w:3", "w:5"] }
         └─ alles andere    { id, type, title, body, places: ["e:17"] }
```

- **Arbeitsbereiche** stehen ganz oben in der Ordnung. Sie liegen nie in etwas
  anderem und sind keine Einträge. Angezeigt werden sie auf ihrer eigenen
  Seite (Karte „Arbeitsbereiche“), je Tab eine Pille; die Übersicht zeigt
  darunter die Projekte, weil man die viel öfter öffnet.
- **Jeder Eintrag hat eine Liste von Ablageorten** (`places`) und erscheint an
  jedem davon: `"w:<id>"` ist ein Arbeitsbereich, `"e:<id>"` ein Projekt, die
  leere Liste heißt Eingang. So liegt ein Projekt zugleich bei Marketing und bei
  Design, wenn beide daran arbeiten. Die Kürzel stehen in `src/data/refs.js`
  und machen eindeutig, welche Nummer gemeint ist.
- **Nur Projekte nehmen Einträge auf** (`containerTypes` in
  `src/data/config.js`). Ein Projekt kann nicht in einem Projekt liegen — so
  kann nie ein Kreis entstehen, und der Baum ist immer höchstens drei Ebenen
  tief.
- **Verknüpfen heißt an- und abwählen:** das Blatt „Verknüpfen“ hat Pillen —
  „Zuletzt“ (was zuletzt geöffnet wurde), „Ablageort“ und je Kategorie eine.
  Jeder Haken lässt sich hinzunehmen oder wegnehmen, nachträglich und von
  überall. „Eingang” nimmt alle Orte weg.
- **Löschen ist ortsbezogen:** Verschwindet ein Ort (Arbeitsbereich gelöscht,
  „Alle Einträge löschen“), wird er aus den Einträgen gestrichen. Was nur dort
  lag, ist weg bzw. rückt in den Eingang; was auch woanders liegt, bleibt dort.
  Inhalte eines gelöschten Projekts übernehmen dessen Orte.
- **Die Karten Favoriten, Arbeitsbereiche und Ressourcen sind Sammlungen**,
  keine Orte: sie zeigen alles Markierte, alle Arbeitsbereiche, alle
  Dokumente, Zeichnungen und Medien — egal, wo sie liegen. Nur der Eingang ist
  ein Ort. Die Projekte stehen in **Ansichten** (`src/data/project-views.js`):
  „Alle“ fest, eigene Ansichten mit Sortierung, Ort-Filter, „Nur Favoriten“
  oder einer handverlesenen Liste. In der Oberfläche heißen sie immer
  „Ansicht“, nie „Tab“ — Tabs sind die Pillen der Arbeitsbereiche.
- **Der Typ lässt sich nachträglich ändern** (`src/data/convert.js`): aus einer
  Notiz wird eine Aufgabe, aus einer Aufgabe ein Projekt, aus einem Eintrag ein
  Arbeitsbereich — und zurück. Die Regel dabei: was zu einem Ding gehört,
  gehört danach zum neuen Ding. Ein Projekt und ein Arbeitsbereich nehmen auf,
  alles andere verknüpft; beim Wechsel wird darum aus Verknüpfungen Inhalt und
  aus Inhalt Verknüpfungen. Nur Zeichnung und Medium bleiben, was sie sind —
  ihr Inhalt ist die Zeichenfläche bzw. die Datei.
- Arbeitsbereiche und Projekte haben einen freien Text (`body`) und zeigen
  ihre Einträge unter **Verknüpfte Einträge**, nach Typ gruppiert in der
  Reihenfolge aus `typeOrder`. Jede Unterseite — Arbeitsbereich, Übersichts-
  karte oder einzelner Eintrag (Aufgabe, Notiz, Termin, Zeichnung, Projekt …)
  — zeigt dafür dieselben zwei Pillen **Inhalt** und **Verknüpfte Einträge**.

## Performance

- **Nachladen:** Kalender, Aufgaben, Medien, Suche, Ressourcen, Fortschritt, Profil,
  Zeichnung und die Dateiverarbeitung kommen erst beim ersten Öffnen dazu
  (`src/core/lazy.js`) und werden danach in Ruhephasen vorgeladen — das erste
  Öffnen fühlt sich dann sofort an.
- **Nur Sichtbares zeichnen:** eine versteckte Seite wird nie neu aufgebaut.
- **Ein Klick-Empfänger je Liste** statt eines Zuhörers pro Zeile.
- **Tippen speichert verzögert** (`scheduleSave()`), damit im Titel und im Text
  nicht bei jedem Buchstaben der ganze Datenstand geschrieben wird.
- **CSS-Werte werden gemerkt** (`src/core/css-vars.js`), damit Wischen und
  Ziehen nicht bei jeder Bewegung eine Neuberechnung auslösen.
- **Timer laufen nur, solange sie gebraucht werden** (die Jetzt-Linie im
  Kalender tickt nur bei offener Kalenderseite).
- Gemessen auf dem Entwicklungsserver: die Startseite ist nach rund 65 ms
  bedienbar, der gesamte Startcode lädt in zwei parallelen Wellen.

Die Dateien werden absichtlich nicht zusammengefasst oder komprimiert (z.B.
mit Vite): das würde nur einen Build-Schritt hinzufügen, der nach Android
nicht mitwandert. Der Webspace liefert sie komprimiert aus (`.htaccess`).

## Flows zum Durchprüfen

Welche Wege nach einer Änderung durchzuklicken sind, steht in
`docs/flows.md` (alle Seiten) und `docs/android-flows.md` (was die
Android-Fassung eigens macht). Immer: `python3 tools/version.py` ausführen,
dann meldet `python3 tools/check.py` „alles in Ordnung“; Konsole leer; einmal
mit `localStorage.clear()` neu laden, einmal mit vorhandenen Daten; hell und
dunkel bei 375 px Breite.
