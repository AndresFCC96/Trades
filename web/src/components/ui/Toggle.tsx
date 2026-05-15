type Props = {
  checked: boolean;
  onChange: () => void;
  label?: string;
};

export function Toggle({ checked, onChange, label }: Props) {
  return (
    <label
      onClick={onChange}
      className="flex items-center gap-2 cursor-pointer font-mono text-sm text-fg"
    >
      <span
        className="relative inline-block w-7 h-3.5 rounded-[2px]"
        style={{ background: checked ? '#4ade80' : 'var(--border)' }}
      >
        <span
          className="absolute top-[1px] w-3 h-3 transition-[left] duration-150"
          style={{ left: checked ? 15 : 1, background: 'var(--knob)' }}
        />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}
