import { useState } from "react";
import { suggestTranslations } from "../services/translate";

/**
 * Champ de traduction manuel, avec suggestions facultatives d'un service
 * gratuit. Une suggestion ne fait que remplir le champ : elle reste modifiable
 * et n'est enregistrée qu'avec le reste du formulaire.
 *
 * `known` = traduction déjà enregistrée ailleurs pour ce nom (programme,
 * bibliothèque, autre semaine) : proposée en premier, pour ne pas retraduire
 * ce qui l'est déjà.
 */
export function TranslationInput({
  value,
  onChange,
  source,
  known,
  label = "Traduction",
}: {
  value: string;
  onChange: (value: string) => void;
  /** Texte à traduire (le nom saisi). */
  source: string;
  known?: string;
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
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex gap-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${label} (facultatif)`}
          aria-label={label}
          dir="auto"
          className="ht-input min-w-0 flex-1"
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
      {known && known !== value && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[var(--ht-text-2)]">
            Déjà traduit ailleurs :
          </span>
          <button
            type="button"
            dir="auto"
            onClick={() => onChange(known)}
            className="ht-pill ht-pill-ok"
            style={{ whiteSpace: "normal", borderRadius: 12 }}
          >
            {known}
          </button>
        </div>
      )}
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
              style={{ whiteSpace: "normal", borderRadius: 12 }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
