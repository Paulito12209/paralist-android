/*
 * Die Einstellungen hinter dem runden Knopf oben rechts, als ganze Seite:
 * Profilkopf (der Name darin ist ein Schreibfeld, profile-name.js), die
 * Darstellung und die Konto-Listen. Tippt man eine Zeile an,
 * tritt an die Stelle der Liste ihre Unterseite; die Kopfleiste nennt dann
 * deren Namen. Nutzungszeit und Serie stehen nicht hier, sondern im
 * Fortschritt. Der Bereich heißt weiter „profile“, weil die Seite am
 * Profilkopf hängt.
 * Unter „App“ führen vier Zeilen zu Navigation, Suche, Design und Tabs
 * (app-settings.js), unter „Konto“ die Konto-Seiten (account.js) — ohne Konto
 * stattdessen „Profil“ und „Daten“ (account-phase.js) —, unter
 * „Support“ zwei auf das Feedback-Formular und die Danksagungen; „Roadmap“
 * ist dagegen ein Link nach draußen und braucht hier nichts (Adresse in
 * profile-cards.js). Unter „Mehr“ führt „Versionen“ zur Wahl der Fassung
 * (versions.js); „Nach Updates suchen“ bittet die Hülle, die neueste Fassung
 * zu laden. Wird erst beim ersten Öffnen nachgeladen.
 * Pfad: src/features/profile/profile.js
 *
 * ANPASSBARE WERTE IN DIESER DATEI
 * -----------------------------------
 * pageTitle -> Überschrift der Seite, solange die Liste zu sehen ist
 *
 * Aussehen: styles/profile.css, styles/settings.css, styles/overlays.css und
 * styles/android-pages.css.
 */

import { emit, events } from "../../core/bus.js";
import { dom, el } from "../../core/dom.js";
import { ui } from "../../data/state.js";
import { flushUsage, trackUsage } from "../../data/usage.js";
import { bindModalPull, clearModalPull } from "../../ui/modal-pull.js";
import { closeCtxMenu } from "../../ui/ctx-menu.js";
import { registerOverlay } from "../../ui/router.js";
import { closeSheet, openSheet } from "../../ui/sheet.js";
import { hideCropper, openCropper } from "./avatar-crop.js";
import {
  bindPhotoInputs,
  commitDraft,
  currentPhoto,
  currentSource,
  discardDraft,
  hasDraft,
  renderAvatarStage,
  renderProfileButton,
  setDraft,
} from "./avatar.js";
import { onAccountClick } from "./account.js";
import { onAppSettingsClick } from "./app-settings.js";
import { noteFeedbackInput, onFeedbackClick } from "./feedback.js";
import { identityCard, listsMarkup } from "./profile-cards.js";
import { initProfileName } from "./profile-name.js";
import {
  appearanceSection,
  detailHash,
  detailMarkup,
  detailTitle,
  enterDetail,
  isDetail,
  settleDetail,
} from "./settings-cards.js";
import { setTheme } from "./theme.js";
import { onVersionsClick } from "./versions.js";

const pageTitle = "Einstellungen";

/* Welche große Ansicht zuletzt gezeichnet wurde — null steht für die Liste. */
let shownDetail = null;
/* Wie weit die Liste gescrollt war, als eine Unterseite aufging — beim Zurück
   landet man wieder an derselben Stelle statt ganz oben. */
let listScroll = 0;

/** Die Seite zeichnen: entweder die Liste oder die aufgeklappte Kachel. */
export function renderProfile() {
  shownDetail = ui.settingsDetail;
  /* is-list: nur die Liste bekommt Kachelgruppen ohne Titel */
  dom.profileBody.classList.toggle("is-list", !shownDetail);
  dom.profileBody.innerHTML = shownDetail ? detailMarkup(shownDetail) : identityCard() + appearanceSection() + listsMarkup();
  /* Die Kopfleiste nennt auf einer Unterseite deren Namen. */
  el("profile-title").textContent = shownDetail ? detailTitle(shownDetail) : pageTitle;
  /* Der Pfeil steht immer: auf einer Unterseite führt er zur Liste, auf der
     Liste schließt er die Seite. */
  el("profile-back").hidden = false;
  el("profile-head").classList.toggle("is-back", Boolean(shownDetail));
  if (shownDetail) settleDetail(shownDetail);
}

/* Neu zeichnen, ohne dass die Liste nach oben springt. */
function rerenderKeepingScroll() {
  const scroll = dom.profileBody.scrollTop;
  renderProfile();
  dom.profileBody.scrollTop = scroll;
}

/* Die Leiste „Abbrechen / Speichern“ erscheint nur, solange eine Änderung offen ist. */
function showSaveBar(on) {
  dom.profileSave.hidden = !on;
}

function applyDraft(value, whole = null) {
  setDraft(value, whole);
  rerenderKeepingScroll();
  showSaveBar(true);
}

function dropDraft() {
  discardDraft();
  showSaveBar(false);
}

/** Eine Kachel aufklappen: die volle Karte tritt an die Stelle der Liste. */
function openDetail(key) {
  if (!isDetail(key)) return;
  enterDetail(key);
  listScroll = dom.profileBody.scrollTop;
  ui.settingsDetail = key;
  renderProfile();
  dom.profileBody.scrollTop = 0;
  /* stack: wie viele Schritte das Schließen zurückgehen muss (Liste und Unterseite) */
  history.pushState({ view: "profile", detail: key, stack: 2, from: ui.sourceView }, "", `#/einstellungen/${detailHash(key)}`);
}

/** Von der Unterseite zurück zur Liste — auf der Liste schließt der Pfeil die Seite. */
function closeDetail() {
  if (!ui.settingsDetail) {
    close();
    return;
  }
  if (history.state && history.state.view === "profile" && history.state.detail) {
    history.back();
    return;
  }
  ui.settingsDetail = null;
  renderProfile();
  dom.profileBody.scrollTop = listScroll;
}

/** Die Seite und die große Bildansicht ohne Umweg über den Verlauf schließen. */
export function hide() {
  dom.profileModal.hidden = true;
  dom.avatarView.hidden = true;
  hideCropper();
  ui.settingsDetail = null;
  listScroll = 0;
  dropDraft();
  clearModalPull(dom.profileModal);
  clearModalPull(dom.avatarView);
}

/**
 * Die Seite öffnen.
 * @param push false, wenn der Verlauf sie zurückholt — dann sagt `entry`, ob
 *   dabei eine Kachel aufgeklappt war.
 */
export function open(push = true, entry = null) {
  closeSheet();
  closeCtxMenu();
  emit(events.overlayOpened);
  /* Das Fortschritt-Blatt liegt an derselben Stelle: es weicht. */
  dom.progressModal.hidden = true;
  trackUsage();
  flushUsage();

  ui.settingsDetail = entry && isDetail(entry.detail) ? entry.detail : null;
  /* Neu gezeichnet wird nur, wenn die Seite zu war oder eine andere Ebene dran
     ist — sonst bliebe die Liste stehen, wo die Kachel hingehört. */
  if (dom.profileModal.hidden || ui.settingsDetail !== shownDetail) {
    /* Zurück von einer Unterseite auf dieselbe Liste: Scrollstand von vorher. */
    const backToList = !dom.profileModal.hidden && !ui.settingsDetail && shownDetail;
    renderProfile();
    dom.profileBody.scrollTop = backToList ? listScroll : 0;
  }
  clearModalPull(dom.profileModal);
  dom.profileModal.hidden = false;

  if (push) {
    dom.avatarView.hidden = true;
    history.pushState({ view: "profile", from: ui.sourceView }, "", "#/einstellungen");
  }
}

/** Die Seite schließen; der Verlauf geht dabei einen Schritt zurück. */
export function close() {
  if (dom.profileModal.hidden) return;
  const entry = history.state;
  if (entry && entry.view === "profile") {
    /* Bei aufgeklappter Kachel liegen zwei Schritte im Verlauf: das Kreuz
       schließt beide, sonst stünde danach wieder die Liste offen. */
    history.go(-(entry.stack || (entry.detail ? 2 : 1)));
    return;
  }
  hide();
}

/** Die große Bildansicht öffnen. */
export function openAvatarView(push = true) {
  renderAvatarStage();
  clearModalPull(dom.avatarView);
  dom.avatarView.hidden = false;
  if (push) history.pushState({ view: "avatar", from: "profile" }, "", "#/einstellungen/bild");
}

/** Die große Bildansicht schließen. */
export function closeAvatarView() {
  if (dom.avatarView.hidden) return;
  if (history.state && history.state.view === "avatar") {
    history.back();
    return;
  }
  dom.avatarView.hidden = true;
  clearModalPull(dom.avatarView);
}

function hideAvatarView() {
  dom.avatarView.hidden = true;
}

/* Den Ausschnitt-Editor schließen; er hat einen eigenen Verlaufsschritt. */
function closeCropper() {
  if (history.state && history.state.view === "avatar-crop") {
    history.back();
    return;
  }
  hideCropper();
}

/*
 * Das gewählte Bild vormerken. Schließt der Editor über den Verlauf, wird der
 * Entwurf erst gesetzt, wenn der Verlauf zurück ist und die Seite wieder steht.
 */
function finishCrop(value, whole) {
  if (!history.state || history.state.view !== "avatar-crop") {
    applyDraft(value, whole);
    return;
  }
  window.addEventListener("popstate", () => applyDraft(value, whole), { once: true });
}

/* Den Ausschnitt wählen — für ein neues Foto oder das schon hinterlegte. */
function startCrop(whole) {
  openCropper(whole, { done: finishCrop, close: closeCropper });
  history.pushState({ view: "avatar-crop", from: "profile" }, "", "#/einstellungen/bild/ausschnitt");
}

/* Das Blatt „Profilbild“ mit den Quellen, dem Ausschnitt und dem Entfernen. */
function openAvatarPicker() {
  const options = [
    { icon: "camera", label: "Foto aufnehmen", onSelect: () => el("profile-file-photo").click() },
    { icon: "photos", label: "Aus der Bibliothek", onSelect: () => el("profile-file-library").click() },
  ];
  const whole = currentSource();
  if (whole) options.push({ icon: "image", label: "Ausschnitt ändern", onSelect: () => startCrop(whole) });
  if (currentPhoto()) {
    options.push({
      icon: "trash",
      label: "Bild entfernen",
      danger: true,
      split: true,
      onSelect: () => applyDraft(""),
    });
  }
  openSheet("Profilbild", options);
}

/* Was „Nach Updates suchen“ rechts in der Zeile anzeigt. */
const updateStatus = {
  checking: "Wird gesucht …",
  loading: "Wird geladen …",
  current: "Aktuell",
  offline: "Kein Netz",
};

/* Die Hülle (src/shell/update-prompt.js) sieht nach und lädt eine neuere
   Fassung sofort; hier steht nur, was sie zurückmeldet. */
function checkForUpdateNow(row) {
  if (row.dataset.busy === "1") return;
  const status = row.querySelector(".plist-status");
  const show = (key) => {
    status.textContent = updateStatus[key] || "";
    row.dataset.busy = key === "checking" || key === "loading" ? "1" : "";
  };
  show("checking");
  emit(events.updateRequested, { report: show });
}

/* Klicks auf der Seite: Feedback-Seite, Bild, Unterseiten, Darstellung, Versionen, Zeitraum. */
function onBodyClick(event) {
  if (onAccountClick(event)) return;
  if (onFeedbackClick(event)) {
    rerenderKeepingScroll();
    return;
  }
  if (event.target.closest("[data-avatar-edit]")) {
    openAvatarPicker();
    return;
  }
  if (event.target.closest("[data-avatar-view]")) {
    openAvatarView();
    return;
  }
  if (event.target.closest('[data-settings-action="update"]')) {
    checkForUpdateNow(event.target.closest("button"));
    return;
  }
  const card = event.target.closest("[data-settings-detail]");
  if (card) {
    openDetail(card.dataset.settingsDetail);
    return;
  }
  const theme = event.target.closest("[data-theme-option]");
  if (theme) {
    setTheme(theme.dataset.themeOption);
    rerenderKeepingScroll();
    return;
  }
  if (onAppSettingsClick(event) || onVersionsClick(event)) {
    rerenderKeepingScroll();
    return;
  }
  const range = event.target.closest("[data-usage-range]");
  if (!range) return;
  ui.usageRange = Number(range.dataset.usageRange);
  rerenderKeepingScroll();
}

/* Beim Laden des Moduls einmal alles anmelden. */
function init() {
  el("profile-close").addEventListener("click", close);
  el("profile-back").addEventListener("click", closeDetail);
  dom.profileModal.addEventListener("click", (event) => {
    if (event.target === dom.profileModal) close();
  });
  dom.profileBody.addEventListener("click", onBodyClick);
  /* Tippen wird nur gemerkt, nicht neu gezeichnet — sonst spränge die
     Schreibmarke im Feedback-Formular bei jedem Buchstaben ans Ende. */
  dom.profileBody.addEventListener("input", noteFeedbackInput);
  initProfileName(dom.profileBody);

  el("avatar-view-close").addEventListener("click", closeAvatarView);
  dom.avatarView.addEventListener("click", (event) => {
    if (event.target === dom.avatarView) closeAvatarView();
  });

  el("profile-photo-cancel").addEventListener("click", () => {
    dropDraft();
    rerenderKeepingScroll();
  });
  el("profile-photo-save").addEventListener("click", () => {
    if (!hasDraft()) return;
    commitDraft();
    showSaveBar(false);
    renderProfileButton();
    rerenderKeepingScroll();
  });

  bindPhotoInputs((image) => startCrop({ image, crop: null }));
  bindModalPull(dom.profileModal, close);
  bindModalPull(dom.avatarView, closeAvatarView);

  registerOverlay("profile", { open, hide, close });
  registerOverlay("avatar", { open: openAvatarView, hide: hideAvatarView });
  /* Den Editor holt der Verlauf nicht zurück — das gewählte Foto ist dann nicht mehr da. */
  registerOverlay("crop", { open: () => {}, hide: hideCropper });
}

init();
