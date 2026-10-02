/*
 * Springt aus einer Seite direkt in die Einstellungen › Tabs — z.B. aus dem
 * Hinweis, warum sich „Alle“ nicht filtern lässt. Lädt die Einstellungen erst
 * bei Bedarf (src/core/lazy.js); sie gehen als Unterseite „Tabs“ auf.
 * Pfad: src/ui/settings-link.js
 *
 * Keine anpassbaren visuellen Werte.
 */

import { load } from "../core/lazy.js";

/** Die Einstellungen auf der Unterseite „Tabs“ öffnen. */
export function openTabSettings() {
  load("profile").then((module) => module.open(true, { detail: "tabs" }));
}
