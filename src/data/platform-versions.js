/*
 * Welche Fassung der App gezeigt wird: „Android“ ist die Fassung, die die
 * App wird; „Android (Experiment)“ sammelt daneben die Versuche. Die Wahl
 * bleibt gespeichert und gilt dauerhaft, bis man sie unter Einstellungen ›
 * Mehr › Versionen ändert. Sichtbar wird sie als data-mobile-variant an
 * <html>; Stile für das Experiment hängen sich daran, z.B.
 * :root[data-mobile-variant="experiment"] .tab-pills { … }. Reiner Zustand
 * ohne Zugriff auf die Seite: angewendet wird die Wahl in index.html (vor dem
 * ersten Bild) und in src/features/profile/versions.js.
 * Pfad: src/data/platform-versions.js
 *
 * ANPASSBARE WERTE IN DIESER DATEI
 * -----------------------------------
 * fallback               -> welche Fassung gilt, solange nichts gewählt ist
 *                           (dieselbe Vorgabe steht im Skript oben in index.html)
 * options                -> die wählbaren Fassungen: Name und Icon der Zeile;
 *                           `variant` setzt data-mobile-variant an <html>
 *                           (ebenso im Skript in index.html)
 * options[*].differences -> was das Experiment anders macht: je Bereich ein
 *                           Satz; das ⓘ hinter dem Namen listet sie in einem
 *                           Blatt auf (src/features/profile/versions.js)
 *
 * Neue Versuche kommen in „Android (Experiment)“ und eine Zeile in deren
 * `differences` — keine weitere Fassung.
 */

import { readJson, storageKeys, writeJson } from "../core/storage.js";

export const fallback = "android";

export const options = [
  { id: "android", label: "Android", icon: "smartphone" },
  /* Die Versuche, gesammelt in einer Fassung (styles/android-segmented.css, styles/android-view-btn.css) */
  {
    id: "android-experiment",
    label: "Android (Experiment)",
    icon: "smartphone",
    variant: "experiment",
    differences: [
      { area: "Ansicht", text: "Das Symbol „Ansicht“ steht nicht mehr in der Reiterzeile oder der Kopfzeile einer Sammlung; das Blatt öffnet das Symbol in der Werkzeugzeile unter den Reitern (der Kalender hat keine solche Zeile: dort steht es rechts neben seinen Reitern, im Stundenraster neben „KW“)." },
      { area: "Reiter", text: "Die Reiter (Projekte, Aufgaben, Medien, Arbeitsbereiche, Kalender …) liegen in einer grauen Kapsel, der gewählte hell darauf — statt reinem Text mit Linie darunter." },
      { area: "Neu anlegen", text: "Im Eingabe-Blatt steht statt „Speichern“ ein Mikrofon neben einem runden Pfeil-Knopf: grau, solange nichts getippt oder angehängt ist, danach gefärbt." },
      { area: "Einstellungen", text: "Die Einstellungsseite folgt den Google-Einstellungen: runder Zurück-Knopf, der Seitenname groß darunter, Bild und Name als schlichte Zeile, die Zeilen ohne Icons und Pfeile in Gruppen mit stark gerundeten Außenecken." },
      { area: "Übersicht", text: "Sichtbare Abstände: Suchleiste → Überschrift 32, Überschrift → Kacheln 24, Kacheln → „Projekte“ 32, „Projekte“ → Reiter 16 Pixel." },
    ],
  },
];

/** Die gewählte Fassung: "android" oder "android-experiment". */
export function chosenVersion() {
  const stored = readJson(storageKeys.versions, {}).mobile;
  return options.some((option) => option.id === stored) ? stored : fallback;
}

/** Die Spielart der gewählten Fassung für <html> ("" für keine). */
export function chosenVariant() {
  return versionOption(chosenVersion())?.variant || "";
}

/** Eine Fassung mit ihren Angaben (Name, Unterschiede) — oder undefined. */
export function versionOption(versionId) {
  return options.find((option) => option.id === versionId);
}

/** Der Name der gewählten Fassung, z.B. „Android“ — für die Zeile unter „Mehr“. */
export function chosenLabel() {
  return versionOption(chosenVersion())?.label || "";
}

/** Eine Fassung wählen und merken. Unbekannte Werte werden still übergangen. */
export function setVersion(versionId) {
  if (!options.some((option) => option.id === versionId)) return;
  writeJson(storageKeys.versions, { mobile: versionId });
}
