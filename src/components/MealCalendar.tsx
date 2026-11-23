import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { voteCounts } from "../domain/feedback";
import { MEALS, daysOfWeek, dinersOf, itemTranslation, slotKey, snacksForDay } from "../domain/mealPlan";
import { itemStatus } from "../domain/mealStatus";
import type { TranslationIndex } from "../domain/translations";
import type { MealItem, MealPlan } from "../types";

/** Largeur minimale du tableau : en dessous, il défile horizontalement. */
const TABLE_MIN_WIDTH = "34rem";
/** Appui long (tactile) avant de saisir un plat ; en dessous, le doigt fait défiler. */
const HOLD_MS = 350;
const EDGE = 48;

interface DragInfo {
  fromKey: string;
  index: number;
  label: string;
}

type StartDrag = (event: ReactPointerEvent, info: DragInfo) => void;

function Items({
  items,
  translations,
  muted,
  fromKey,
  onStartDrag,
  draggingIndex,
}: {
  items: MealItem[];
  translations?: TranslationIndex;
  muted?: boolean;
  /** Créneau d'origine de ces plats (pour un snack reporté, celui du jour d'origine). */
  fromKey: string;
  onStartDrag?: StartDrag;
  draggingIndex: number | null;
}) {
  return (
    <ul className={`flex flex-col gap-1 ${muted ? "italic opacity-70" : ""}`}>
      {items.map((item, index) => {
        const translation = itemTranslation(item, translations);
        const status = itemStatus(item);
        const counts = voteCounts(item);
        return (
          <li
            key={`${item.label}-${index}`}
            data-drag-item={onStartDrag ? "" : undefined}
            onPointerDown={
              onStartDrag
                ? (e) => onStartDrag(e, { fromKey, index, label: item.label })
                : undefined
            }
            onContextMenu={onStartDrag ? (e) => e.preventDefault() : undefined}
            style={onStartDrag ? { WebkitTouchCallout: "none" } : undefined}
            className={`leading-snug ${onStartDrag ? "select-none" : ""} ${draggingIndex === index ? "opacity-40" : ""}`}
          >
            {/* L'arabe sur sa ligne, le français (quand il existe) dessous. */}
            <span
              dir="auto"
              className={`block break-words ${status === "skipped" ? "line-through" : ""}`}
            >
              {status === "prepared" && <span aria-label="préparé">✓ </span>}
              {status === "skipped" && <span aria-label="non préparé">✗ </span>}
              {item.label}
              {counts.up > 0 && <span aria-label="apprécié"> 👍{counts.up}</span>}
              {counts.down > 0 && <span aria-label="à améliorer"> 👎{counts.down}</span>}
            </span>
            {translation && (
              <span
                dir="auto"
                className="block break-words text-[10px] text-[var(--ht-text-2)]"
              >
                {translation}
              </span>
            )}
            {status === "skipped" && item.skipReason && (
              <span className="block break-words text-[10px] text-[var(--ht-text-2)]">
                {item.skipReason}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Créneau sous le doigt/curseur, d'après les attributs des cellules. */
function cellAt(x: number, y: number): { slot: string; origin: string } | null {
  const el = document.elementFromPoint?.(x, y)?.closest<HTMLElement>("[data-slot]");
  if (!el?.dataset.slot) return null;
  return { slot: el.dataset.slot, origin: el.dataset.origin ?? el.dataset.slot };
}

/**
 * Vue d'ensemble de la semaine, comme le cahier : un jour par ligne, trois
 * colonnes (snacks, déjeuner, dîner). Sur un petit écran le tableau défile
 * horizontalement (flèches de chaque côté) avec la colonne des jours figée.
 * Les snacks d'un jour vide sont ceux du dernier jour non vide, en italique ;
 * un tap sur un jour ouvre son détail.
 *
 * Avec `onMove`, un plat se déplace par glisser-déposer : appui long puis glisser au
 * doigt, ou simple glisser à la souris. Le tableau défile tout seul près des bords.
 */
export function MealCalendar({
  plan,
  onSelectDay,
  translations,
  onMove,
}: {
  plan: MealPlan;
  onSelectDay: (dayKey: string) => void;
  translations?: TranslationIndex;
  /** Déplace le plat `index` du créneau `fromKey` vers `toKey`. Absent = lecture seule. */
  onMove?: (fromKey: string, index: number, toKey: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const press = useRef<{
    info: DragInfo;
    x: number;
    y: number;
    touch: boolean;
    active: boolean;
    timer?: ReturnType<typeof setTimeout>;
  } | null>(null);
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  function scroll(direction: -1 | 1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy?.({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
  }

  function endPress() {
    const p = press.current;
    if (p?.timer) clearTimeout(p.timer);
    press.current = null;
    setDrag(null);
    setGhost(null);
    setHover(null);
  }

  function activate() {
    const p = press.current;
    if (!p || p.active) return;
    p.active = true;
    setDrag(p.info);
    setGhost({ x: p.x, y: p.y });
    navigator.vibrate?.(15);
  }

  function startDrag(event: ReactPointerEvent, info: DragInfo) {
    if (!onMove || press.current || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }
    const touch = event.pointerType !== "mouse";
    press.current = {
      info,
      x: event.clientX,
      y: event.clientY,
      touch,
      active: false,
      timer: touch ? setTimeout(activate, HOLD_MS) : undefined,
    };
  }

  // Les écouteurs de suivi ne servent que pendant une saisie.
  const dragging = drag !== null;
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const p = press.current;
      if (!p) return;
      const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      if (!p.active) {
        // Avant la saisie : un doigt qui bouge, c'est un défilement ; une souris, une saisie.
        if (p.touch && moved > 8) endPress();
        else if (!p.touch && moved > 5) activate();
        else return;
      }
      p.x = e.clientX;
      p.y = e.clientY;
      setGhost({ x: e.clientX, y: e.clientY });
      setHover(cellAt(e.clientX, e.clientY)?.slot ?? null);
    }
    function onPointerUp(e: PointerEvent) {
      const p = press.current;
      if (p?.active) {
        const target = cellAt(e.clientX, e.clientY);
        if (target && target.origin !== p.info.fromKey) {
          onMoveRef.current?.(p.info.fromKey, p.info.index, target.slot);
        }
      }
      endPress();
    }
    function onTouchMove(e: TouchEvent) {
      // Une fois le plat saisi, le doigt le déplace au lieu de faire défiler la page.
      if (press.current?.active && e.cancelable) e.preventDefault();
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", endPress);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", endPress);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  // Défilement automatique près des bords pendant le glissement.
  useEffect(() => {
    if (!dragging) return;
    const timer = setInterval(() => {
      const p = press.current;
      const el = scroller.current;
      if (!p?.active) return;
      if (el) {
        const rect = el.getBoundingClientRect();
        if (p.x < rect.left + EDGE) el.scrollBy?.({ left: -14 });
        else if (p.x > rect.right - EDGE) el.scrollBy?.({ left: 14 });
      }
      if (p.y < EDGE) window.scrollBy?.({ top: -14 });
      else if (p.y > window.innerHeight - EDGE) window.scrollBy?.({ top: 14 });
    }, 16);
    return () => clearInterval(timer);
  }, [dragging]);

  return (
    <div className="relative">
      {onMove && (
        <p className="mb-2 text-xs text-[var(--ht-text-2)]">
          Pour déplacer un plat : maintenez-le, puis glissez-le dans une autre case.
        </p>
      )}
      <div ref={scroller} className="ht-card overflow-x-auto">
        <table
          className="w-full table-fixed border-collapse text-xs"
          style={{ minWidth: TABLE_MIN_WIDTH }}
        >
          <thead>
            <tr className="text-[var(--ht-text-2)]">
              <th
                scope="col"
                className="sticky left-0 z-10 w-14 bg-[var(--ht-card-solid)] p-2 text-left font-semibold"
              >
                <span className="sr-only">Jour</span>
              </th>
              {MEALS.map((meal) => (
                <th
                  key={meal.key}
                  scope="col"
                  className="p-2 text-left font-semibold"
                >
                  {meal.fr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daysOfWeek(plan.weekId).map((day) => {
              const snacks = snacksForDay(plan, day.key);
              return (
                <tr
                  key={day.key}
                  className="border-t border-[var(--ht-input-border)] align-top"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-[var(--ht-card-solid)] p-2 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectDay(day.key)}
                      aria-label={`Détail du ${day.fr.toLowerCase()} ${day.date.getDate()}`}
                      className="text-left font-extrabold text-[var(--ht-text)]"
                    >
                      {day.fr.slice(0, 3)}.
                      <span className="block font-normal text-[var(--ht-text-2)]">
                        {day.date.getDate()}
                      </span>
                    </button>
                  </th>
                  {MEALS.map((meal) => {
                    const key = slotKey(day.key, meal.key);
                    const slot = plan.slots[key];
                    const isSnack = meal.key === "snack";
                    const items = isSnack ? snacks.items : (slot?.items ?? []);
                    // Un snack reporté appartient au créneau du jour d'origine.
                    const origin =
                      isSnack && snacks.inheritedFrom
                        ? slotKey(snacks.inheritedFrom.key, "snack")
                        : key;
                    return (
                      <td
                        key={meal.key}
                        data-testid={`cell-${day.key}-${meal.key}`}
                        data-slot={onMove ? key : undefined}
                        data-origin={onMove ? origin : undefined}
                        className={`p-2 text-[var(--ht-text)] ${drag && hover === key ? "bg-[var(--ht-input-border)]" : ""}`}
                      >
                        {items.length > 0 ? (
                          <>
                            <Items
                              items={items}
                              translations={translations}
                              muted={isSnack && !!snacks.inheritedFrom}
                              fromKey={origin}
                              onStartDrag={onMove ? startDrag : undefined}
                              draggingIndex={drag && drag.fromKey === origin ? drag.index : null}
                            />
                            {!isSnack && (
                              <span className="mt-1 block text-[10px] text-[var(--ht-text-2)]">
                                {dinersOf(plan, slot)} p.
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="block min-h-6 text-[var(--ht-text-2)]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {drag && ghost && (
        <div
          aria-hidden="true"
          dir="auto"
          className="ht-card pointer-events-none fixed z-50 max-w-[60vw] px-3 py-1.5 text-xs font-semibold shadow-lg"
          style={{
            left: ghost.x,
            top: ghost.y,
            transform: "translate(-50%, -120%)",
            background: "var(--ht-card-solid)",
          }}
        >
          {drag.label}
        </div>
      )}

      <button
        type="button"
        aria-label="Défiler le calendrier vers la gauche"
        onClick={() => scroll(-1)}
        className="ht-btn absolute top-1/2 left-1 z-20 h-8 w-8 -translate-y-1/2 p-0 opacity-90"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Défiler le calendrier vers la droite"
        onClick={() => scroll(1)}
        className="ht-btn absolute top-1/2 right-1 z-20 h-8 w-8 -translate-y-1/2 p-0 opacity-90"
      >
        ›
      </button>
    </div>
  );
}
