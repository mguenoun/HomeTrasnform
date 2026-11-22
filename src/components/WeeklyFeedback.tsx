import { useState } from "react";
import { buildFeedbackMessage } from "../domain/feedback";
import { whatsappUrl } from "../domain/mealPlan";
import type { TranslationIndex } from "../domain/translations";
import type { MealPlan } from "../types";

/**
 * Retour de fin de semaine à la personne de ménage : un message bilingue
 * généré à partir des plats préparés, appréciés ou à améliorer, et de ce qui
 * n'a pas pu être préparé. Il s'ouvre pré-rempli mais reste entièrement
 * modifiable : on le relit avant de l'envoyer.
 */
export function WeeklyFeedback({
  plan,
  translations,
}: {
  plan: MealPlan;
  translations?: TranslationIndex;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setText(buildFeedbackMessage(plan, translations));
          setOpen(true);
        }}
        className="ht-btn mb-3 self-start px-3 py-1.5 text-sm"
      >
        Retour de fin de semaine
      </button>
    );
  }

  return (
    <section className="ht-card mb-3 flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-[var(--ht-text)]">
          Retour de fin de semaine
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-[var(--ht-text-2)]"
        >
          Fermer
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Message de fin de semaine"
        dir="auto"
        rows={12}
        className="ht-input"
      />
      <p className="text-xs text-[var(--ht-text-2)]">
        Message généré à partir de vos retours : relisez-le et modifiez-le avant
        l&apos;envoi, notamment les titres en arabe.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={whatsappUrl(text)}
          target="_blank"
          rel="noopener noreferrer"
          className="ht-btn-cta-sm"
        >
          Envoyer le retour sur WhatsApp
        </a>
        <button
          type="button"
          onClick={() => setText(buildFeedbackMessage(plan, translations))}
          className="ht-btn px-3 py-1.5 text-sm"
        >
          Régénérer
        </button>
      </div>
    </section>
  );
}
