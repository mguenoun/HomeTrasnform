import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && (
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">
              /
            </span>
          )}
          {item.to ? (
            <Link
              to={item.to}
              className="text-sky-700 hover:underline dark:text-sky-400"
            >
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-slate-500 dark:text-slate-400">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
