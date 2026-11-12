import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const input =
  "h-9 w-full rounded-lg border border-line-strong bg-night-900 px-3 text-sm text-chalk placeholder:text-chalk-faint focus:border-turf focus:outline-none";

function Label({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold tracking-wide text-chalk-muted uppercase">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-xs text-chalk-faint">{hint}</span>}
    </label>
  );
}

export function TextField({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <Label label={label} hint={hint}>
      <input className={input} {...props} />
    </Label>
  );
}

export function TextArea({ label, hint, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <Label label={label} hint={hint}>
      <textarea className={`${input} h-auto min-h-20 py-2`} {...props} />
    </Label>
  );
}

export function SelectField({
  label,
  hint,
  options,
  emptyLabel,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  options: { value: string | number; label: string }[];
  emptyLabel?: string;
}) {
  return (
    <Label label={label} hint={hint}>
      <select className={input} {...props}>
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Label>
  );
}

export function CheckField({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="accent-turf" {...props} />
      {label}
    </label>
  );
}
