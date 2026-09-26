import type { ReactNode } from "react";

export function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field-shell">
      <div className="field-label">{label}</div>
      {children}
    </div>
  );
}
