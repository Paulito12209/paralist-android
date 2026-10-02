/*
 * Die Fortschritt-Seite hinter der Level-Anzeige oben links: Ring, Analyse
 * (Nutzungszeit und Serie), Meilensteine, Verlauf, nächste Stufen und
 * Historie. Tippt man eine Karte an („Meilensteine“, „Nutzungszeit“, „Serie“),
 * tritt deren eigene Seite an die Stelle der Karten — mit Pfeil zurück, wie im
 * Einstellungs-Blatt. Die Seite hat eine Kopfleiste (Pfeil links, Titel der
 * Seite) und wird erst beim ersten Öffnen nachgeladen.
 * Pfad: src/features/progress/progress.js
 *
 * ANPASSBARE WERTE IN DIESER DATEI
 * -----------------------------------
 * pages -> die Unterseiten: Titel (steht in der Kopfleiste), Stück Adresse
 *          hinter „#/fortschritt/“ und Inhalt
 *
 * Sonst keine anpassbaren visuellen Werte: siehe styles/progress.css,
 * styles/milestones.css und styles/overlays.css.
 */

import { emit, events, on } from "../../core/bus.js";
import { dom, el } from "../../core/dom.js";
import { ui } from "../../data/state.js";
import { insightsSection } from "../../ui/insight-tiles.js";
import { bindModalPull, clearModalPull } from "../../ui/modal-pull.js";
import { registerOverlay } from "../../ui/router.js";
import { streakCard, usageCard } from "../../ui/usage-pages.js";
import { closeCtxMenu } from "../../ui/ctx-menu.js";
import { closeSheet } from "../../ui/sheet.js";
import { donutCard, historyCard } from "./progress-charts.js";
import { historyPageSize, levelsCard, logCard } from "./progress-lists.js";
import { enterMilestones, milestonesPage, milestonesTeaser, toggleMilestone } from "./progress-milestones.js";

const rootTitle = "Fortschritt";

/* Die Unterseiten: Name, Stück Adresse und Inhalt. Die Karten tragen ihren
   Namen schon selbst im Kopf; die Überschrift davor blendet
   styles/android-pages.css aus — der Name steht in der Kopfleiste. */
const pages = {
  milestones: { title: "Meilensteine", hash: "meilensteine", markup: () => milestonesPage(), enter: enterMilestones },
  usage: { title: "Nutzungszeit", hash: "nutzungszeit", markup: () => pageHeading("Nutzungszeit") + usageCard() },
  streak: { title: "Serie", hash: "serie", markup: () => pageHeading("Serie") + streakCard() },
};

function pageHeading(title) {
  return `<h3 class="settings-detail-title">${title}</h3>`;
}

/* Die Analyse-Kacheln (Nutzungszeit und Serie); ein Tipp öffnet die Unterseite. */
function insightsBlock() {
  return `<section class="progress-insights">${insightsSection("data-progress-detail")}</section>`;
}

/* Offene Unterseite des Blatts: null für die Karten, sonst ein Schlüssel aus `pages`. */
let detail = null;

/** Das Blatt zeichnen: die Karten oder eine Unterseite. */
export function renderProgress() {
  dom.progressBody.innerHTML = detail
    ? pages[detail].markup()
    : donutCard() + insightsBlock() + milestonesTeaser() + historyCard() + levelsCard() + logCard();
  /* Links steht immer der Pfeil — auf den Karten schließt er die Seite, auf
     einer Unterseite führt er zu den Karten — und in der Leiste der Name der
     Seite. */
  el("progress-title").textContent = detail ? pages[detail].title : rootTitle;
  el("progress-back").hidden = false;
  /* Auf einer Unterseite rücken Pfeil und Titel zusammen nach links — sie sind
     der Weg zurück zu den Karten (siehe .modal-head.is-back). */
  el("progress-head").classList.toggle("is-back", Boolean(detail));
}

/* Neu zeichnen, ohne dass die Liste nach oben springt. */
function rerenderKeepingScroll() {
  const scroll = dom.progressBody.scrollTop;
  renderProgress();
  dom.progressBody.scrollTop = scroll;
}

/**
 * Das Blatt öffnen.
 * @param push false, wenn der Verlauf es zurückholt — dann sagt `entry`, ob
 *   dabei die Seite „Meilensteine“ offen war.
 */
export function open(push = true, entry = null) {
  closeSheet();
  closeCtxMenu();
  emit(events.overlayOpened);
  /* Das Profil-Blatt liegt an derselben Stelle: es weicht. */
  dom.profileModal.hidden = true;
  dom.avatarView.hidden = true;

  const wanted = entry && pages[entry.detail] ? entry.detail : null;
  if (wanted && wanted !== detail) pages[wanted].enter?.();
  detail = wanted;
  ui.historyLimit = historyPageSize;
  renderProgress();
  clearModalPull(dom.progressModal);
  dom.progressModal.hidden = false;
  dom.progressBody.scrollTop = 0;
  if (push) history.pushState({ view: "progress", from: ui.sourceView }, "", "#/fortschritt");
}

/** Eine Unterseite öffnen; sie bekommt einen eigenen Schritt im Verlauf. */
export function openPage(key) {
  if (!pages[key]) return;
  pages[key].enter?.();
  detail = key;
  renderProgress();
  dom.progressBody.scrollTop = 0;
  history.pushState({ view: "progress", detail, from: ui.sourceView }, "", `#/fortschritt/${pages[key].hash}`);
}

/* Der Pfeil links: auf einer Unterseite zurück zu den Karten, auf den Karten
   (nur als Seite sichtbar) das Blatt schließen. */
function goBack() {
  if (!detail) {
    close();
    return;
  }
  if (history.state && history.state.view === "progress" && history.state.detail) {
    history.back();
    return;
  }
  detail = null;
  renderProgress();
}

/** Das Blatt ohne Umweg über den Verlauf schließen. */
export function hide() {
  dom.progressModal.hidden = true;
  detail = null;
}

/** Das Blatt schließen; der Verlauf geht dabei einen Schritt zurück. */
export function close() {
  if (dom.progressModal.hidden) return;
  const entry = history.state;
  if (entry && entry.view === "progress") {
    /* Auf einer Unterseite liegen zwei Schritte im Verlauf: das Kreuz
       schließt beide, sonst stünden danach wieder die Karten offen. */
    history.go(entry.detail ? -2 : -1);
    return;
  }
  hide();
}

/* Klicks im Blatt: Zeitraum umstellen, mehr Historie, Unterseite öffnen, Meilenstein aufklappen. */
function onBodyClick(event) {
  const range = event.target.closest("[data-range]");
  if (range) {
    ui.progressRange = Number(range.dataset.range);
    rerenderKeepingScroll();
    return;
  }
  const usageRange = event.target.closest("[data-usage-range]");
  if (usageRange) {
    ui.usageRange = Number(usageRange.dataset.usageRange);
    rerenderKeepingScroll();
    return;
  }
  if (event.target.closest("#history-more")) {
    ui.historyLimit += historyPageSize;
    rerenderKeepingScroll();
    return;
  }
  const page = event.target.closest("[data-progress-detail]");
  if (page) {
    openPage(page.dataset.progressDetail);
    return;
  }
  const row = event.target.closest("[data-milestone]");
  if (row) {
    toggleMilestone(row.dataset.milestone);
    rerenderKeepingScroll();
  }
}

/* Beim Laden des Moduls einmal alles anmelden. */
function init() {
  el("progress-close").addEventListener("click", close);
  el("progress-back").addEventListener("click", goBack);
  dom.progressModal.addEventListener("click", (event) => {
    if (event.target === dom.progressModal) close();
  });
  dom.progressBody.addEventListener("click", onBodyClick);
  bindModalPull(dom.progressModal, close);
  registerOverlay("progress", { open, hide, close });
  /* Neue Punkte oder ein abgehakter Eintrag: die offene Seite zählt mit. */
  on(events.xpChanged, () => {
    if (!dom.progressModal.hidden) rerenderKeepingScroll();
  });
}

init();
