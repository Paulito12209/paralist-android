/*
 * Die Unterseite Einstellungen › Mehr › Versionen: „Android“ und „Android
 * (Experiment)“ — genau eine Wahl mit Haken. Die Wahl gilt dauerhaft und
 * steht als data-mobile-variant an <html> (Zustand in
 * src/data/platform-versions.js). Klicks kommen aus
 * src/features/profile/profile.js über onVersionsClick.
 * Pfad: src/features/profile/versions.js
 *
 * Das Experiment trägt ein ⓘ hinter seinem Namen; ein Tipp darauf öffnet ein
 * Blatt, das je Bereich auflistet, was es anders macht als „Android“ — und
 * wählt es nicht aus.
 *
 * ANPASSBARE WERTE IN DIESER DATEI
 * -----------------------------------
 * title        -> Überschrift über der Gruppe
 * note         -> der graue Satz unter der Gruppe
 * diffHeading  -> Überschrift über der Liste im Blatt
 *
 * Aussehen der Zeilen und Hinweise in styles/settings.css.
 */

import { escapeHtml, icon } from "../../core/html.js";
import { chosenLabel, chosenVariant, chosenVersion, options, setVersion, versionOption } from "../../data/platform-versions.js";
import { openSheet } from "../../ui/sheet.js";

const title = "Fassung";
const diffHeading = "Anders als „Android“";
const note = "Die gewählte Fassung bleibt, bis du sie hier änderst.";

/** Die Wahl an <html> schreiben, damit die Stile der Fassung sofort greifen. */
export function applyVersions() {
  const root = document.documentElement;
  const variant = chosenVariant();
  if (variant) root.dataset.mobileVariant = variant;
  else delete root.dataset.mobileVariant;
}

/** Kurzfassung für den rechten Rand der Zeile, z.B. „Android“. */
export function versionsSummary() {
  return chosenLabel();
}

/* Die Zeilen, der Haken bei der gewählten Fassung. */
function rowsMarkup() {
  const chosen = chosenVersion();
  return options
    .map((option) => {
      const on = option.id === chosen;
      /* Kein Knopf im Knopf: das ⓘ ist ein span, den onVersionsClick zuerst prüft */
      const info = option.differences
        ? `<span class="sheet-info" role="button" tabindex="0" data-version-info="${option.id}" aria-label="Was ist anders an „${escapeHtml(option.label)}“?">${icon("info")}</span>`
        : "";
      return `
      <button class="settings-row${on ? " is-active" : ""}" type="button" data-version="${option.id}" aria-pressed="${on}">
        ${icon(option.icon)}
        <span class="settings-row-label">${option.label}${info}</span>
        ${icon("check", "settings-check")}
      </button>`;
    })
    .join("");
}

/** Unterseite Versionen. */
export function versionsCard() {
  return `<p class="psection">${title}</p><div class="settings-group">${rowsMarkup()}</div><p class="settings-note">${note}</p>`;
}

/* Blatt mit den Unterschieden einer Fassung: je Bereich Name und Satz */
function openDifferences(versionId) {
  const option = versionOption(versionId);
  if (!option?.differences) return;
  openSheet(option.label, [
    { heading: true, label: diffHeading },
    ...option.differences.map((item) => ({ detail: true, label: item.area, value: item.text })),
  ]);
}

/** Klick auf eine Fassung erledigen. Gibt true zurück, wenn er hierher gehörte. */
export function onVersionsClick(event) {
  const info = event.target.closest("[data-version-info]");
  if (info) {
    openDifferences(info.dataset.versionInfo);
    return true;
  }
  const row = event.target.closest("[data-version]");
  if (!row) return false;
  setVersion(row.dataset.version);
  applyVersions();
  return true;
}
