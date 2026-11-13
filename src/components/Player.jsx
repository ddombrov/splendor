import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/lib/utils';
import { COLORS, CF_TEXT } from '../engine/data.js';
import { JewelCard, CardBack } from './Cards.jsx';
import { TokenArt, Gem, Scroll, Crown } from './Art.jsx';
import { bonuses, colorPts, crowns, kinds, plan, pts, resCap, roomLeft } from '../engine/engine.js';

const Label = ({ children }) => (
  <div className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</div>
);
const Stat = ({ title, children }) => (
  <div title={title} className="flex h-7 items-center gap-1 text-xl font-extrabold leading-none">{children}</div>
);

export default function Player({ S, idx, dispatch, colW = 52 }) {
  const p = S.players[idx];
  const active = idx === S.cur;
  const pd = S.pending;
  const canDisc = pd?.type === 'discard' && active;
  const canSteal = pd?.type === 'steal' && !active;
  const canReturn = active && !S.main && !pd && roomLeft(p) === 0;
  const b = bonuses(p);
  const tokens = [...kinds(S), 'gold'].filter((k) => p.tok[k] > 0);

  return (
    <Card className={cn('relative min-h-0 flex-1 gap-0 overflow-hidden p-3', active && 'border-primary/50')}>
      {active && <BorderBeam size={120} duration={9} borderWidth={2} colorFrom="#d9b15a" colorTo="#d9b15a00" />}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold">{p.name}</h3>
        </div>
        <div className="flex items-center gap-3">
          <Stat title="Prestige points">
            <NumberTicker value={pts(p)} className="tracking-normal text-foreground dark:text-foreground" />
          </Stat>
          <Stat title="Crowns">
            <NumberTicker value={crowns(p)} className="tracking-normal text-foreground dark:text-foreground" />
            <Crown size={22} />
          </Stat>
          <Stat title="Scrolls">
            <span>{p.priv}</span>
            <Scroll size={24} />
          </Stat>
        </div>
      </div>

      <div className="mt-3 flex min-h-10 items-end gap-2.5">
        {tokens.map((k) => {
          const click = canReturn ? () => dispatch({ type: 'giveBack', c: k }) : canDisc ? () => dispatch({ type: 'disc', c: k }) : canSteal && k !== 'gold' ? () => dispatch({ type: 'steal', c: k }) : null;
          return (
            <div key={k} title={canReturn ? `Return a ${k} token to the bag` : `${k}: ${p.tok[k]}`} onClick={click} className={cn('flex flex-col-reverse items-center', click && 'pile click')}>
              {Array.from({ length: p.tok[k] }, (_, i) => (
                <div key={i} className="leading-none" style={{ marginBottom: i ? -18 : 0 }}><TokenArt kind={k} size={32} /></div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex min-h-8 items-start gap-1" title="Purchased cards">
        {COLORS.map((c) => {
          const owned = p.cards.filter((x) => x.color === c);
          if (!owned.length) return null;
          const z = colW / 124;
          const strip = Math.round(40 * z);
          return (
            <div key={c} className="compact-cards pointer-events-none relative shrink-0" style={{ width: colW, height: strip + (owned.length - 1) * strip, '--z': z }}>
              {owned.map((card, i) => (
                <div key={card.id} className="absolute left-0 overflow-hidden rounded-[6px]" style={{ top: i * strip, height: strip, width: colW }}>
                  <JewelCard card={card} />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {p.royals.length > 0 && (
        <>
          <Label>Royal cards</Label>
          <div className="text-xs">{p.royals.map((r) => `${r.pts} pts`).join(', ')}</div>
        </>
      )}
      {p.cf.length > 0 && (
        <>
          <Label>Counterfeiters</Label>
          <div className="flex flex-col gap-1">
            {p.cf.map((c) => (
              <span key={c.id} className={cn('border-l-2 border-violet-400 pl-1.5 text-[10px] leading-tight', S.used[c.id] && active && 'opacity-45')}>
                {CF_TEXT[c.ab](c)}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="compact-cards mt-3" style={{ '--z': 0.52 }}>
        <div className="rowline wrap">
          {Array.from({ length: resCap(p) }, (_, i) => {
            const c = p.res[i];
            if (!c) return <div key={`slot${i}`} className="slot" />;
            return active ? (
              <JewelCard
                key={c.id}
                card={c}
                selected={S.selCard?.src === 'res' && S.selCard.i === i}
                afford={!S.main && !!plan(S, p, c)}
                onClick={() => dispatch({ type: 'card', src: 'res', i })}
              />
            ) : (
              <CardBack key={c.id} level={c.level} label="?" count="" />
            );
          })}
        </div>
      </div>
    </Card>
  );
}
