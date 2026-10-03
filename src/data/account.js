/*
 * Die Angaben zum Konto: Name, Mailadresse, Plan und die Version der App.
 * Die Einstellungen zeigen sie im Kopf. Solange es noch keine Anmeldung gibt,
 * stehen die Vorgaben hier; den Namen tippt man im Kopf der Einstellungen
 * selbst ein (src/features/profile/profile-name.js), er bleibt im Browser
 * gespeichert. Beim ersten Öffnen ist der Name leer, im Feld steht dann der
 * Platzhalter „Dein Name“ (src/features/profile/profile-cards.js). Die
 * Initialen im runden Bild entstehen aus dem Namen: der erste Buchstabe des
 * ersten und des letzten Worts; ohne Namen steht fallbackInitials im Bild.
 * Pfad: src/data/account.js
 *
 * ANPASSBARE WERTE IN DIESER DATEI
 * -----------------------------------
 * account.name     -> Name im Profil, solange keiner eingetippt wurde (leer = Platzhalter „Dein Name“)
 * account.mail     -> Mailadresse unter dem Namen im Profil (leer = nichts im Kopf, „Hinzufügen“ unter „Persönliche Daten“)
 * account.since    -> „Dabei seit …“ unter der Mailadresse; davor steht der Plan (nur mit Konto, Phase 2)
 * account.plan     -> Plan im Profilkopf und rechts in der Zeile „Plan verwalten“
 * account.phone    -> Telefonnummer unter „Persönliche Daten“ (leer = „Hinzufügen“)
 * account.links    -> eigene Links unter „Persönliche Daten“: Name und Adresse (leere Adresse = „Hinzufügen“)
 * account.devices  -> Geräte auf der Seite „Synchronisierung“: Name, Icon, letzter Abgleich
 * account.version  -> Versionszeile am Ende des Profils
 * maxNameLength    -> so viele Zeichen darf der Name höchstens haben
 * fallbackInitials -> was im Bild steht, wenn der Name keinen Buchstaben hat
 */

import { readText, storageKeys, writeText } from "../core/storage.js";

export const account = {
  name: "",
  mail: "",
  since: "Dabei seit Juni 2025",
  plan: "Pro",
  phone: "",
  links: [{ label: "Website", url: "" }],
  /* Cloud-Sync gibt es noch nicht: die Geräte zeigen nur den Aufbau der Seite */
  devices: [
    { name: "Dieses Gerät", icon: "smartphone", synced: "Gerade eben" },
    { name: "Web", icon: "laptop", synced: "Vor 2 Std" },
  ],
  version: "PARALIST 0.1.0 (MVP)",
};

export const maxNameLength = 60;
const fallbackInitials = "?";

/** Mehrfache Leerzeichen und Zeilenumbrüche auf eines eindampfen, Enden abschneiden. */
export function tidyName(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxNameLength);
}

/** Der Name im Profil: der eingetippte, sonst die Vorgabe. */
export function accountName() {
  return tidyName(readText(storageKeys.accountName)) || account.name;
}

/** Den Namen merken. Ein leerer Name fällt auf die Vorgabe zurück. */
export function setAccountName(value) {
  const name = tidyName(value);
  writeText(storageKeys.accountName, name === account.name ? "" : name);
  return accountName();
}

/**
 * Die Initialen zu einem Namen: „Anna Berg“ → „AB“, „Anna“ → „A“,
 * „Anna Berg Cordes“ → „AC“ (erstes und letztes Wort).
 */
export function initialsOf(name) {
  const words = tidyName(name).split(" ").filter((word) => /\p{L}|\p{N}/u.test(word));
  if (!words.length) return fallbackInitials;
  const first = [...words[0]][0];
  const last = words.length > 1 ? [...words[words.length - 1]][0] : "";
  return (first + last).toLocaleUpperCase("de");
}

/** Die Initialen des gespeicherten Namens. */
export function accountInitials() {
  return initialsOf(accountName());
}
