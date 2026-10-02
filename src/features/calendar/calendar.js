/*
 * Die Kalenderseite. Wird erst beim ersten Öffnen nachgeladen und setzt dann
 * Streifen, Fläche (Tagesraster oder Liste), das Panel „Ansicht“
 * (calendar-settings.js) und Gesten zusammen. In der Listenansicht wechselt
 * waagerechtes Wischen unter dem Streifen zwischen Aufgaben, Termine und
 * Projekte (src/ui/pill-swipe.js).
 * Pfad: src/features/calendar/calendar.js
 *
 * ANPASSBARE WERTE IN DIESER DATEI
 * -----------------------------------
 * tickSeconds -> wie oft die Jetzt-Linie nachgeführt wird (Sekunden)
 *
 * Alle Größen und Farben stehen in styles/calendar.css.
 */

import { emit, events, on } from "../../core/bus.js";
import { dom } from "../../core/dom.js";
import { calendarSegments } from "../../data/config.js";
import { state, ui } from "../../data/state.js";
import { initPillSwipe } from "../../ui/pill-swipe.js";
import { registerReselect } from "../../ui/router.js";
import { isViewActive } from "../../ui/views.js";
import { openDatePicker } from "./calendar-date-picker.js";
import { initCalendarSettings, renderCalendarSettings, setTodayActive } from "./calendar-settings.js";
import { initCalendarGestures, setRedraw as setGestureRedraw } from "./calendar-gestures.js";
import { moveNowLine, nowLineVisible, renderGrid, scrollToNow, sizeGrid, sizeList } from "./calendar-grid.js";
import { initCalendarInline } from "./calendar-inline.js";
import { renderList } from "./calendar-list.js";
import { goToday, setRedraw as setNavRedraw, setSegment } from "./calendar-nav.js";
import { cal } from "./calendar-state.js";
import { renderStrip } from "./calendar-strip.js";
import { dayKey, pad2 } from "../../core/dates.js";

const tickSeconds = 30;

let tickTimer = null;

/**
 * Die ganze Seite neu zeichnen.
 * @param jumpToNow true, wenn das Raster zur aktuellen Uhrzeit rollen soll.
 */
export function renderCalendar(jumpToNow = false) {
  /* Der Scrollstand des Rasters geht beim Neuzeichnen verloren: erst merken,
     danach wiederherstellen — sonst springt der Tag bei jeder Änderung auf
     00:00 zurück. */
  const keepScroll = dom.calPanel.scrollTop;
  renderStrip();
  renderCalendarSettings();
  const grid = state.prefs.calendar.mode === "grid";
  /* is-grid: nur das Stundenraster rollt in sich selbst (styles/calendar-panel.css) */
  dom.calPanel.classList.toggle("is-grid", grid);
  dom.calPanel.innerHTML = grid ? renderGrid() : renderList();
  if (grid) {
    sizeGrid();
    if (jumpToNow) scrollToNow();
    else dom.calPanel.scrollTop = keepScroll;
    updateGridLock();
  } else {
    sizeList();
  }
  /* rAF: die Sichtbarkeit der Jetzt-Linie erst messen, wenn das Rollen im
     Raster übernommen wurde. */
  requestAnimationFrame(updateTodayPill);
}

/* Ob der gewählte Tag der heutige ist. */
function isOnToday() {
  return ui.calendarDay === dayKey(new Date());
}

/*
 * Der „Heute“-Knopf im Kopf des Panels bleibt immer sichtbar. Volle
 * Pillen-Optik mit blauer Schrift bekommt er nur am heutigen Tag und nur,
 * solange die Jetzt-Linie im sichtbaren Ausschnitt steht; sonst bleibt er
 * zurückhaltend im Hintergrund (styles/calendar.css, Klasse .cal-today).
 */
function updateTodayPill() {
  setTodayActive(isOnToday() && nowLineVisible());
}

/*
 * Zwei Stufen beim Scrollen: Solange die Seite noch nicht ganz oben
 * angekommen ist, rollt ein Wisch im Raster die ganze Seite — Titel, Monat
 * und Streifen wandern nach oben, bis der Streifen unter der Suchleiste
 * einrastet. Erst danach darf das Raster in sich selbst rollen.
 * Dafür ist es vorher gesperrt (styles/calendar-panel.css, Klasse is-free);
 * gesperrt heißt nur: kein eigenes Scrollen — sein Stand bleibt erhalten.
 */
function updateGridLock() {
  if (!dom.calPanel.classList.contains("is-grid")) return;
  const page = dom.content;
  const atEnd = page.scrollTop >= page.scrollHeight - page.clientHeight - 1;
  dom.calPanel.classList.toggle("is-free", atEnd);
}

/* Beim Scrollen im Raster oder auf der Seite kann die Jetzt-Linie in den
   sichtbaren Ausschnitt hinein- oder herauslaufen — die Optik des Knopfes
   zieht dann sofort nach. An anderen Tagen gibt es keine Jetzt-Linie: dann
   gar nicht erst messen. */
function onScroll() {
  if (!isViewActive("calendar")) return;
  updateGridLock();
  if (!isOnToday()) return;
  setTodayActive(nowLineVisible());
}

/* Die Jetzt-Linie läuft nur, solange die Kalenderseite offen ist. */
function startTick() {
  if (tickTimer) return;
  tickTimer = setInterval(moveNowLine, tickSeconds * 1000);
}

function stopTick() {
  clearInterval(tickTimer);
  tickTimer = null;
}

/*
 * „Kalender“ unten noch einmal antippen: zuerst wie der „Heute“-Knopf —
 * heutiger Tag, die Jetzt-Linie gut sichtbar —, steht sie schon im Bild, rollt
 * die Seite nach oben und Titel, Monat und Streifen rasten wieder ein.
 */
function onReselect() {
  const grid = state.prefs.calendar.mode === "grid";
  /* Die Liste hat keine Jetzt-Linie: dort nur nach oben rollen, oben dann „Heute“. */
  if (grid && !(isOnToday() && nowLineVisible())) {
    goToday();
    return;
  }
  if (dom.content.scrollTop > 1) dom.content.scrollTo({ top: 0, behavior: "smooth" });
  else goToday();
}

/*
 * In der Fläche: Spalte wechseln oder eine leere Stunde antippen, um dort
 * einen Termin anzulegen.
 */
function onPanelClick(event) {
  const seg = event.target.closest("[data-seg]");
  if (seg) {
    setSegment(seg.dataset.seg);
    return;
  }
  if (event.target.closest("[data-open-entry]")) return;
  const hour = event.target.closest("[data-hour]");
  if (!hour) return;
  emit(events.composerRequested, { date: ui.calendarDay, time: `${pad2(Number(hour.dataset.hour))}:00` });
}

/* Neue Fenstergröße: Raster und Liste messen ihre Höhe neu. */
function onResize() {
  if (!isViewActive("calendar")) return;
  if (state.prefs.calendar.mode !== "grid") {
    sizeList();
    return;
  }
  sizeGrid();
  updateGridLock();
}

/* Beim Laden des Moduls einmal alles anmelden. */
function init() {
  setNavRedraw(renderCalendar);
  setGestureRedraw(renderCalendar);
  initCalendarGestures();

  initCalendarSettings();
  /* Das Datum unter „Kalender“ öffnet das Blatt „Datum“ mit den drei Rollen. */
  dom.calMonthBtn.addEventListener("click", () => openDatePicker("date"));
  /* Die KW rechts daneben öffnet dasselbe Blatt mit den Rollen Jahr | KW. */
  dom.calKwBtn.addEventListener("click", () => openDatePicker("week"));
  dom.calPanel.addEventListener("click", onPanelClick);
  initCalendarInline();
  /* Nur auf der Fläche unter dem Streifen: dort blättert waagerechtes Wischen
     schon Wochen um. Das Stundenraster hat keine Tabs. */
  initPillSwipe(dom.calPanel, {
    order: calendarSegments.map((item) => item.id),
    current: () => state.prefs.calendar.seg,
    select: setSegment,
    enabled: () => state.prefs.calendar.mode !== "grid",
  });
  dom.content.addEventListener("scroll", onScroll, { passive: true });
  dom.calPanel.addEventListener("scroll", onScroll, { passive: true });
  /* Dreht sich das Gerät oder ändert sich die Fensterhöhe, passt die Höhe des
     Rasters nicht mehr: neu messen. */
  window.addEventListener("resize", onResize);

  on(events.viewOpened, (name) => {
    if (name !== "calendar") {
      stopTick();
      return;
    }
    /* Beim Öffnen steht die Seite wieder ganz oben: Titel, Monat, Streifen
       und die drei Knöpfe sind vollständig zu sehen. Die Uhrzeit sucht sich
       das Raster in sich selbst. */
    dom.content.scrollTop = 0;
    renderCalendar(true);
    startTick();
  });
  on(events.dataChanged, () => {
    if (isViewActive("calendar")) renderCalendar();
  });
  registerReselect("calendar", onReselect);

  /* Wurde die Seite schon geöffnet, bevor dieses Modul fertig geladen war: jetzt zeichnen. */
  if (isViewActive("calendar")) {
    dom.content.scrollTop = 0;
    renderCalendar(true);
    startTick();
  }
}

init();
