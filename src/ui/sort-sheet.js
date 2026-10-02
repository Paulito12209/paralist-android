/*
 * Das Blatt „Sortieren“: eine einfache Liste wie in Google Tasks — kleine
 * Überschrift „Sortieren nach“, die Möglichkeiten (Erstellt, Fällig, Titel …)
 * mit Haken links, darunter „Reihenfolge“ mit den zwei Richtungen, deren
 * Wortlaut die gewählte Möglichkeit liefert — „A bis Z“ / „Z bis A“,
 * „Älteste zuerst“ / „Neueste zuerst“. Ein Tipp wählt und schließt sofort
 * (Auswahl-Blatt aus src/ui/sheet.js, Stile in styles/android-bottom-sheet.css).
 *
 * Eine Option ist { id, label, icon, up, down, asc }: `up` ist der Wortlaut
 * für aufsteigend, `down` für absteigend, `asc` die natürliche Richtung —
 * die gilt, sobald man zu dieser Option wechselt.
 * Pfad: src/ui/sort-sheet.js
 *
 * ANPASSBARE WERTE IN DIESER DATEI
 * -----------------------------------
 * dirHeading   -> Überschrift über den Richtungen
 * listHeading  -> kleine Überschrift über den Möglichkeiten
 */

import { openSheet } from "./sheet.js";

const dirHeading = "Reihenfolge";
const listHeading = "Sortieren nach";

/* Die gewählte Option; eine unbekannte (alter Speicherstand) gilt als die erste. */
function optionOf(options, sort) {
  return options.find((option) => option.id === sort) || options[0];
}

/** Kurzform für die Zeile in einer Karte: „Name · A bis Z“. */
export function sortSummary(options, sort, asc) {
  const option = optionOf(options, sort);
  return `${option.label} · ${asc ? option.up : option.down}`;
}

/* Die natürliche Richtung einer Option. */
function naturalOf(option) {
  return option.asc ?? true;
}

/**
 * Das Blatt öffnen. Zu einer anderen Möglichkeit zu wechseln setzt ihre
 * natürliche Richtung (Namen von A, Daten vom neuesten an, wie in Google
 * Drive); dieselbe noch einmal zu wählen ändert nichts.
 * @param options  die Optionen wie oben beschrieben
 * @param sort     id der gewählten Option
 * @param asc      true = aufsteigend
 * @param onChange (sort, asc) — speichert die Wahl; die Liste dahinter zeichnet sich selbst neu
 */
export function openSortSheet({ options, sort, asc, onChange }) {
  const current = optionOf(options, sort);
  const natural = naturalOf(current);
  const by = options.map((option) => ({
    label: option.label,
    leadCheck: true,
    active: option.id === current.id,
    onSelect: () => {
      if (option.id !== current.id) onChange(option.id, naturalOf(option));
    },
  }));
  const order = [natural, !natural].map((dirAsc) => ({
    label: dirAsc ? current.up : current.down,
    leadCheck: true,
    active: dirAsc === asc,
    onSelect: () => {
      if (dirAsc !== asc) onChange(current.id, dirAsc);
    },
  }));
  openSheet("", [{ heading: true, label: listHeading }, ...by, { heading: true, label: dirHeading }, ...order]);
}
