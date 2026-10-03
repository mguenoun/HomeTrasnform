import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className="mb-3.5 flex flex-wrap items-center gap-1 text-xs text-[var(--ht-text-2)]"
    >
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && (
            <span aria-hidden="true" className="text-[var(--ht-text-3)]">
              /
            </span>
          )}
          {item.to ? (
            <Link to={item.to} className="ht-link">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-semibold text-[var(--ht-text)]">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
