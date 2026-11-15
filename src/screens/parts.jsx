import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gem } from '@/components/Art.jsx';
import { cn } from '@/lib/utils';

/** A row of choices where exactly one is picked. */
export function Segmented({ value, onChange, options, className }) {
  return (
    <Tabs value={value} onValueChange={onChange} className={className}>
      <TabsList className="w-full">
        {options.map((o) => (
          <TabsTrigger key={o.value} value={o.value} disabled={o.disabled} className="flex-1">{o.label}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export const Field = ({ label, hint, children }) => (
  <div className="space-y-2">
    <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

/** The five gem colours in a row, used as decoration. */
export const GemRow = ({ size = 40, className }) => (
  <div className={cn('flex items-end justify-center gap-3', className)}>
    {['red', 'white', 'black', 'blue', 'green'].map((g) => <Gem key={g} kind={g} size={size} />)}
  </div>
);

/** A game code shown as five boxes. */
export const CodeBoxes = ({ code, big }) => (
  <div className="flex justify-center gap-2">
    {code.padEnd(5, ' ').split('').map((d, i) => (
      <div key={i} className={cn('flex items-center justify-center rounded-lg border bg-card font-extrabold', big ? 'h-20 w-14 text-5xl' : 'h-12 w-9 text-2xl')}>
        {d.trim()}
      </div>
    ))}
  </div>
);

/** A text box for the player's name. */
export const NameField = ({ value, onChange, onEnter, autoFocus }) => (
  <input
    autoFocus={autoFocus}
    value={value}
    onChange={(e) => onChange(e.target.value.slice(0, 20))}
    onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
    placeholder="Your name"
    maxLength={20}
    className="w-full rounded-lg border bg-background px-4 py-3 text-lg font-semibold outline-none placeholder:text-muted-foreground/50 focus:border-primary"
  />
);
