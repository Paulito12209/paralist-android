/*
 * Das kleine weiße Menü, das beim gedrückt Halten eines Tabs,
 * Arbeitsbereichs oder Eintrags aufgeht. Es steht immer unten rechts, wo der
 * Daumen hinreicht, mit demselben Abstand zur Navigationsleiste und zum Rand
 * wie der Plus-Knopf.
 * Pfad: src/ui/ctx-menu.js
 *
 * Keine anpassbaren Werte in dieser Datei: Aussehen und Rundung stehen in
 * styles/overlays.css (Klasse .ctx-card), der Abstand zur Leiste in
 * styles/tokens-android.css (--m3-fab-gap), die Stelle unten rechts in
 * styles/android.css.
 */

import { dom } from "../core/dom.js";
import { escapeHtml, icon } from "../core/html.js";

let actions = [];

/** Menü schließen. */
export function closeCtxMenu() {
  dom.ctxMenu.hidden = true;
  actions = [];
}

/* Unten rechts: Unterkante der Karte so hoch über dem Gerätefuß wie die
   Oberkante der Leiste plus Plus-Knopf-Abstand. Ist die Leiste weggescrollt,
   rückt die Karte mit ihr nach unten (die Regel dazu steht in styles/android.css). */
function placeCard() {
  const deviceRect = dom.device.getBoundingClientRect();
  const navRect = dom.navShell.getBoundingClientRect();
  dom.ctxCard.style.setProperty("--ctx-nav-top", `${Math.max(0, Math.round(deviceRect.bottom - navRect.top))}px`);
}

/**
 * Menü öffnen. Optionen sind { label, icon, onSelect, danger, active }.
 * `anchor` ist das gehaltene Element — die Karte unten rechts braucht es nicht.
 * Steht bei einer Option `active`, ist das Menü eine Auswahl: vor jeder Zeile
 * bleibt Platz für einen Haken, den nur die gewählte Zeile zeigt.
 */
export function openCtxMenu(anchor, options) {
  dom.sheet.hidden = true;
  const choice = options.some((option) => "active" in option);
  dom.ctxCard.innerHTML = options
    .map(
      (option, index) => `
        <button class="ctx-item${option.danger ? " is-danger" : ""}" type="button" data-ctx="${index}">
          ${choice ? `<span class="ctx-check">${option.active ? icon("check") : ""}</span>` : ""}
          ${icon(option.icon)}
          <span>${escapeHtml(option.label)}</span>
        </button>
      `
    )
    .join("");
  actions = options.map((option) => option.onSelect);
  dom.ctxMenu.hidden = false;
  placeCard();
}

/** Klicks im Menü: Option ausführen, Klick daneben schließt. */
export function initCtxMenu() {
  dom.ctxMenu.addEventListener("click", (event) => {
    const option = event.target.closest("[data-ctx]");
    if (!option) {
      closeCtxMenu();
      return;
    }
    const run = actions[Number(option.dataset.ctx)];
    closeCtxMenu();
    if (run) run();
  });
}
