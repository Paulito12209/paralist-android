/*
 * Der Name oben in den Einstellungen lässt sich jederzeit antippen und
 * ändern: ein Tipp setzt den Cursor ins Feld, beim Tippen ziehen die
 * Initialen im runden Bild sofort mit (nur solange kein Foto hinterlegt ist),
 * Enter oder ein Tipp daneben schließt das Feld. Gespeichert wird nach einer
 * kurzen Pause im Tippen und beim Verlassen; ein leer gelassenes Feld fällt
 * auf den vorigen Namen zurück. Zeilenumbrüche kommen nicht ins Feld, mehr
 * als maxNameLength Zeichen auch nicht (src/data/account.js).
 * Pfad: src/features/profile/profile-name.js
 *
 * ANPASSBARE WERTE IN DIESER DATEI
 * -----------------------------------
 * SAVE_DELAY_MS -> so lange nach dem letzten Buchstaben wird gespeichert
 *
 * Aussehen des Felds in styles/profile.css (.profile-name).
 */

import { accountName, initialsOf, maxNameLength, setAccountName, tidyName } from "../../data/account.js";
import { currentPhoto } from "./avatar.js";

const SAVE_DELAY_MS = 600;

let saveTimer = 0;

function fieldOf(target) {
  return target instanceof Element ? target.closest("[data-profile-name]") : null;
}

/* Die Initialen im Bild neben dem Feld nachziehen — nur ohne Foto */
function syncInitials(field) {
  if (currentPhoto()) return;
  const avatar = field.closest(".profile-id")?.querySelector(".profile-avatar");
  if (avatar) avatar.textContent = initialsOf(field.textContent);
}

/* Zu lange Eingabe abschneiden; der Cursor bleibt am Ende */
function clampLength(field) {
  if (field.textContent.length <= maxNameLength) return;
  field.textContent = field.textContent.slice(0, maxNameLength);
  const range = document.createRange();
  range.selectNodeContents(field);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function save(field) {
  clearTimeout(saveTimer);
  saveTimer = 0;
  /* „Persönliche Daten“ liest den Namen beim nächsten Öffnen frisch */
  return setAccountName(field.textContent);
}

function onInput(event) {
  const field = fieldOf(event.target);
  if (!field) return;
  clampLength(field);
  syncInitials(field);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (tidyName(field.textContent)) save(field);
  }, SAVE_DELAY_MS);
}

function onKeydown(event) {
  const field = fieldOf(event.target);
  if (!field) return;
  if (event.key === "Enter") {
    event.preventDefault();
    field.blur();
  } else if (event.key === "Escape") {
    event.preventDefault();
    field.textContent = accountName();
    field.blur();
  }
}

/* Beim Verlassen: speichern und das Feld sauber hinstellen (ohne Leerzeichen am Rand) */
function onFocusOut(event) {
  const field = fieldOf(event.target);
  if (!field) return;
  const name = save(field);
  field.textContent = name;
  syncInitials(field);
}

/* Eingefügter Text kommt ohne Umbrüche und Formatierung an */
function onPaste(event) {
  const field = fieldOf(event.target);
  if (!field) return;
  event.preventDefault();
  const text = tidyName(event.clipboardData?.getData("text/plain"));
  document.execCommand("insertText", false, text);
}

/**
 * Die Ereignisse des Namensfelds am Inhalt der Einstellungen anmelden —
 * einmal, das Feld selbst wird bei jedem Zeichnen neu angelegt.
 * @param body das Element, in dem die Karten stehen (dom.profileBody)
 */
export function initProfileName(body) {
  body.addEventListener("input", onInput);
  body.addEventListener("keydown", onKeydown);
  body.addEventListener("focusout", onFocusOut);
  body.addEventListener("paste", onPaste);
}
