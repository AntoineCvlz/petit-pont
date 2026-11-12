import type { InputHTMLAttributes } from "react";

export function Field({ label, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold tracking-wide text-chalk-muted uppercase">
        {label}
      </label>
      <input
        id={id}
        className="h-10 w-full rounded-lg border border-line-strong bg-night-900 px-3 text-sm text-chalk placeholder:text-chalk-faint focus:border-turf focus:outline-none"
        {...props}
      />
    </div>
  );
}

export function FormMessage({ tone = "error", children }: { tone?: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          : "rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
      }
    >
      {children}
    </p>
  );
}
