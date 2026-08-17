import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  question: string;
  children?: ReactNode;
}

/**
 * Every surface states the user question it answers. If a surface cannot name
 * its question, it does not need to exist yet.
 */
export function PageHeader({ title, question, children }: PageHeaderProps) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">{question}</p>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}

export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <p className="rounded border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
      {children}
    </p>
  );
}
