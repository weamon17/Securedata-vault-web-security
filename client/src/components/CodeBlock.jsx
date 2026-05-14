// client/src/components/CodeBlock.jsx
// Code block hiển thị JSON/string — dark theme.

const VARIANT = {
  default: 'bg-slate-950 border-slate-800 text-slate-300',
  error:   'bg-red-950/60 border-red-800/40 text-red-200',
  success: 'bg-emerald-950/60 border-emerald-800/40 text-emerald-200',
};

export function CodeBlock({ children, label, variant = 'default' }) {
  const cls = VARIANT[variant] || VARIANT.default;
  const body =
    typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : JSON.stringify(children, null, 2);

  return (
    <div className="my-2">
      {label && (
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      )}
      <pre className={`text-xs ${cls} border rounded-lg p-3 overflow-auto whitespace-pre-wrap break-words font-mono leading-relaxed`}>
        {body}
      </pre>
    </div>
  );
}
