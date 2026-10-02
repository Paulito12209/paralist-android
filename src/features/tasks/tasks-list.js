/*
 * Die Listenansicht der Aufgaben-Seite: eine schlichte Liste aller Aufgaben,
 * die der Filter durchlässt — Haken-Knopf links, Titel, stille Nebenzeile,
 * Pfeil; dahinter dieselben Wisch-Knöpfe wie in jeder anderen Liste der App.
 * Wer im Menü gruppiert, bekommt dieselben Gruppen untereinander, die das
 * Board als Spalten zeigt, jede mit dünner Überschrift (Icon in ihrer Farbe,
 * Name, Anzahl); leere Gruppen fehlen dann.
 *
 * Im Auswahlmodus (src/features/tasks/tasks-select.js) steht vor jeder Zeile
 * ein Kreis zum Wählen und im Kopf jeder Gruppe einer für die ganze Gruppe;
 * die Geister-Zeile fehlt dann.
 *
 * Solange es gar keine Aufgabe gibt, steht der Platzhalter wie am leeren
 * Kalendertag (Icon, Satz, Pille). Siebt nur der Filter alles aus, liegt
 * stattdessen eine blasse Geister-Zeile da, die das Anlegen durch Tippen
 * erklärt (src/features/tasks/tasks-inline.js).
 * Pfad: src/features/tasks/tasks-list.js
 *
 * ANPASSBARE WERTE IN DIESER DATEI
 * -----------------------------------
 * ghostLabel  -> Text der Geister-Zeile, wenn der Filter keine Aufgabe übrig lässt
 * emptyTasks  -> Platzhalter ohne eine einzige Aufgabe: Icon, Satz, Pille
 *
 * Aussehen und Abstände stehen in styles/rows.css und styles/tasks.css.
 */

import { icon } from "../../core/html.js";
import { isTaskDone } from "../../data/config-tasks.js";
import { taskEntries, taskGroups } from "../../data/queries.js";
import { emptyState } from "../../ui/empty-state.js";
import { entryActions, swipeRow } from "../../ui/rows.js";
import { taskCheck } from "../../ui/task-status.js";
import { taskMeta, taskTitle } from "./tasks-parts.js";
import { groupPickMark, isPicked, isSelecting, pickMark } from "./tasks-pick.js";

const ghostLabel = "Neue Aufgabe";
/* Wortlaut wie in der Spalte „Aufgaben“ der Kalenderliste (calendarSegments in src/data/config.js) */
const emptyTasks = {
  icon: "task",
  accent: "var(--cal-accent)",
  title: "Keine Aufgaben",
  action: { label: "Aufgabe hinzufügen", pick: "aufgabe" },
  plain: true,
};

/**
 * Eine Zeile: Haken-Knopf, Titel mit Nebenzeile, Pfeil — dahinter dieselben
 * Wisch-Knöpfe wie in jeder anderen Liste (src/ui/rows.js).
 */
function taskRow(entry, field) {
  const done = isTaskDone(entry);
  const actions = entryActions(entry);
  const picked = isPicked(entry.id) ? " data-picked" : "";
  return swipeRow(
    `data-entry="${entry.id}" data-pick-row="${entry.id}"${picked}`,
    actions.left,
    actions.right,
    `
      ${pickMark(entry.id)}
      ${taskCheck(entry)}
      <button class="workspace-row entry-row task-row" type="button" data-open-entry="${entry.id}">
        <span class="task-main">
          <span class="task-title${done ? " is-done" : ""}">${taskTitle(entry)}</span>
          ${taskMeta(entry, field)}
        </span>
        ${icon("chevron", "chevron")}
      </button>
    `
  );
}

/* Die blasse Zeile, wenn der Filter alles aussiebt: ein leerer Ring, ein
   grauer Text. Ein Tipp darauf macht daraus eine echte Zeile. */
function ghostRow() {
  return `
    <button class="task-ghost" type="button" data-task-ghost>
      <span class="task-check task-ghost-ring" aria-hidden="true"></span>
      <span class="task-ghost-label">${ghostLabel}</span>
    </button>
  `;
}

/* Die Überschrift einer Gruppe — nur, wenn gruppiert wird. */
function headMarkup(column, field) {
  if (!field) return "";
  return `
    <h2 class="task-section-head">
      ${groupPickMark(column.items.map((entry) => entry.id))}
      ${icon(column.icon, "task-section-icon")}
      <span class="task-section-name">${column.label}</span>
      <span class="task-section-count">${column.items.length || ""}</span>
    </h2>
  `;
}

/* Eine Gruppe (oder die ganze Liste): data-section und data-field sagen dem
   Inline-Anlegen, wohin eine neue Aufgabe gehört, wenn hierunter getippt wird. */
function sectionMarkup(column, field, tail) {
  const rows = column.items.map((entry) => taskRow(entry, field)).join("");
  return `
    <section class="task-section" data-pick-scope data-section="${column.id}" data-field="${field || ""}"${column.locked ? " data-no-add" : ""} style="--col-color:${column.color}">
      ${headMarkup(column, field)}
      <div class="workspace-list task-rows">${rows}${tail}</div>
    </section>
  `;
}

/** Die ganze Liste als HTML: flach — oder die Gruppen der Gliederung untereinander. */
export function taskListMarkup(prefs) {
  const { field, columns } = taskGroups(prefs);
  const empty = columns.every((column) => !column.items.length);
  /* Hat der Filter alles ausgesiebt, lädt die Geister-Zeile zum Schreiben ein. */
  const ghost = isSelecting() ? "" : ghostRow();
  /* Ohne eine einzige Aufgabe: der Platzhalter statt der Geister-Zeile. Der leere
     Abschnitt bleibt stehen, damit ✓+ und ein Tipp in die Fläche dort eine Zeile öffnen. */
  const placeholder = !taskEntries().length && !isSelecting() ? emptyState(emptyTasks) : "";
  const tail = !empty || placeholder ? "" : ghost;
  return `<div class="task-sections">${columns
    .filter((column, index) => index === 0 || column.items.length)
    .map((column, index) => sectionMarkup(column, field, index === 0 ? tail : ""))
    .join("")}</div>${placeholder}`;
}
