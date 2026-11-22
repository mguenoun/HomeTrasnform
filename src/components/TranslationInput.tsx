import { useState } from "react";
import { suggestTranslations } from "../services/translate";

/**
 * Champ de traduction manuel, avec suggestions facultatives d'un service
 * gratuit. Une suggestion ne fait que remplir le champ : elle reste modifiable
 * et n'est enregistrée qu'avec le reste du formulaire.
 */
export function TranslationInput({
  value,
  onChange,
  source,
  label = "Traduction",
}: {
  value: string;
  onChange: (value: string) => void;
  /** Texte à traduire (le nom saisi). */
  source: string;
  label?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    setError(null);
    setLoading(true);
    try {
      setSuggestions(await suggestTranslations(source));
    } catch (err) {
      setSuggestions(null);
      setError(
        err instanceof Error ? err.message : "Traduction indisponible.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${label} (facultatif)`}
          aria-label={label}
          dir="auto"
          className="ht-input flex-1"
        />
        <button
          type="button"
          onClick={() => void suggest()}
          disabled={loading || !source.trim()}
          className="ht-btn shrink-0 px-2.5 py-1 text-xs"
        >
          {loading ? "…" : "Suggérer"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-[var(--ht-danger)]">
          {error}
        </p>
      )}
      {suggestions && suggestions.length === 0 && (
        <p className="text-xs text-[var(--ht-text-2)]">
          Aucune suggestion fiable : saisissez la traduction à la main.
        </p>
      )}
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[var(--ht-text-2)]">
            Suggestions à vérifier :
          </span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              dir="auto"
              onClick={() => {
                onChange(suggestion);
                setSuggestions(null);
              }}
              className="ht-pill ht-pill-info"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
