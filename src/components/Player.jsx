import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/lib/utils';
import { COLORS, CF_TEXT } from '../data.js';
import { JewelCard, CardBack } from './Cards.jsx';
import { TokenArt, Gem, Scroll, Crown } from './Art.jsx';
import { bonuses, colorPts, crowns, kinds, plan, pts, total } from '../engine.js';

const Label = ({ children }) => (
  <div className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</div>
);
const Stat = ({ label, children }) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className="flex h-7 items-center gap-1 text-2xl font-extrabold leading-none">{children}</div>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

export default function Player({ S, idx, dispatch }) {
  const p = S.players[idx];
  const active = idx === S.cur;
  const pd = S.pending;
  const canDisc = pd?.type === 'discard' && active;
  const canSteal = pd?.type === 'steal' && !active;
  const b = bonuses(p);
  const tokens = [...kinds(S), 'gold'].filter((k) => p.tok[k] > 0);

  return (
    <Card className={cn('relative gap-0 overflow-hidden p-4', active && 'border-primary/50')}>
      {active && <BorderBeam size={140} duration={9} borderWidth={2} colorFrom="#d9b15a" colorTo="#d9b15a00" />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold">{p.name}</h3>
          {active && <Badge>Your turn</Badge>}
        </div>
        <div className="flex items-center gap-5">
          <Stat label="Prestige"><NumberTicker value={pts(p)} className="tracking-normal text-foreground dark:text-foreground" /></Stat>
          <Stat label="Crowns">
            <NumberTicker value={crowns(p)} className="tracking-normal text-foreground dark:text-foreground" />
            <Crown size={16} />
          </Stat>
          <Stat label="Scrolls">
            {p.priv ? Array.from({ length: p.priv }, (_, i) => <Scroll key={i} size={18} />) : <span className="text-muted-foreground/60">0</span>}
          </Stat>
        </div>
      </div>

      <Label>Tokens ({total(p)})</Label>
      <div className="flex min-h-11 flex-wrap items-center gap-4">
        {tokens.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
        {tokens.map((k) => {
          const click = canDisc ? () => dispatch({ type: 'disc', c: k }) : canSteal && k !== 'gold' ? () => dispatch({ type: 'steal', c: k }) : null;
          return (
            <div key={k} title={k} onClick={click} className={cn('relative leading-none', click && 'pile click')}>
              <TokenArt kind={k} size={40} />
              <span className="absolute -right-1.5 -bottom-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                {p.tok[k]}
              </span>
            </div>
          );
        })}
      </div>

      <Label>Bonuses</Label>
      <div className="flex flex-wrap gap-2">
        {COLORS.filter((c) => b[c]).map((c) => (
          <Badge key={c} variant="outline" className="gap-1.5 py-1 text-sm">
            <Gem kind={c} size={16} />
            {b[c]}
            {colorPts(p, c) ? <span className="text-muted-foreground">· {colorPts(p, c)} pts</span> : null}
          </Badge>
        ))}
        {!COLORS.some((c) => b[c]) && <span className="text-sm text-muted-foreground">None</span>}
      </div>

      {p.royals.length > 0 && (
        <>
          <Label>Royal cards</Label>
          <div className="text-sm">{p.royals.map((r) => `${r.pts} pts`).join(', ')}</div>
        </>
      )}
      {p.cf.length > 0 && (
        <>
          <Label>Counterfeiters</Label>
          <div className="flex flex-col gap-1.5">
            {p.cf.map((c) => (
              <span key={c.id} className={cn('border-l-[3px] border-violet-400 pl-2 text-xs', S.used[c.id] && active && 'opacity-45')}>
                {CF_TEXT[c.ab](c)}
              </span>
            ))}
          </div>
        </>
      )}

      <Label>Reserved ({p.res.length})</Label>
      <div className="rowline wrap">
        {p.res.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
        {p.res.map((c, i) =>
          active ? (
            <JewelCard
              key={c.id}
              card={c}
              selected={S.selCard?.src === 'res' && S.selCard.i === i}
              afford={!S.main && !!plan(S, p, c)}
              onClick={() => dispatch({ type: 'card', src: 'res', i })}
            />
          ) : (
            <CardBack key={c.id} level={c.level} label="?" count="" />
          ),
        )}
      </div>
    </Card>
  );
}
