/*
 * Das Menü beim Halten eines Reiters (Tabs der Arbeitsbereiche, Ansichten der
 * Aufgaben und der Projekte). Es kommt wie in Google Tasks als Blatt von
 * unten über die ganze Breite, ohne Titel (src/ui/sheet.js).
 * Pfad: src/ui/tab-menu.js
 *
 * Keine anpassbaren visuellen Werte: das Blatt steht in
 * styles/android-bottom-sheet.css.
 */

import { openSheet } from "./sheet.js";

/** Menü eines Reiters öffnen; `options` wie bei openSheet. `pill` ist der
    gehaltene Reiter — das Blatt von unten braucht ihn nicht. */
export function showTabMenu(pill, options) {
  openSheet("", options);
}
