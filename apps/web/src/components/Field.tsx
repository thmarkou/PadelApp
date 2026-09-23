export function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "email" | "date" | "time";
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 outline-none focus:border-court focus:ring-2 focus:ring-court/20"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        step={type === "number" ? "any" : undefined}
      />
    </label>
  );
}
