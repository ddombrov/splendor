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

export default function Player({ S, idx, dispatch, colW = 52, viewer = null, onOpen = null, zoomed = false, wide = false, summary = false }) {
  const p = S.players[idx];
  const active = idx === S.cur && !S.awaitingFirst;
  const pd = S.pending;
  const mine = viewer == null || viewer === S.cur;
  const showReserved = viewer == null ? active : idx === viewer;
  const canDisc = pd?.type === 'discard' && active && mine;
  const canSteal = pd?.type === 'steal' && !active && mine;
  const canReturn = active && mine && !S.main && !pd && roomLeft(p) === 0;
  const b = bonuses(p);
  const tokens = [...kinds(S), 'gold'].filter((k) => p.tok[k] > 0);

  if (summary) {
    return (
      <Card data-dest-tokens={idx} data-dest-cards={idx} data-dest-res={idx} onClick={onOpen ?? undefined} className={cn('min-h-0 flex-1 gap-0 overflow-hidden border-transparent bg-transparent p-3 shadow-none', onOpen && 'cursor-zoom-in')}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold">{p.name}</h3>
          <div className="flex items-center gap-2.5">
            <Stat title="Prestige points"><span>{pts(p)}</span></Stat>
            <Stat title="Crowns"><span>{crowns(p)}</span><Crown size={20} /></Stat>
            <Stat title="Scrolls"><span>{p.priv}</span><Scroll size={22} /></Stat>
          </div>
        </div>
        <div className="mt-2 flex items-start justify-between gap-1">
          {[...kinds(S), 'gold'].map((k) => (
            <div key={k} title={`${k}: ${p.tok[k]} tokens${b[k] ? `, ${b[k]} cards` : ''}`} className="flex flex-col items-center gap-0.5">
              <TokenArt kind={k} size={26} />
              <span className="text-base font-extrabold leading-none">{p.tok[k]}</span>
              <span className="h-3 text-[11px] leading-3 text-muted-foreground">{b[k] ? `+${b[k]}` : ''}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card
      onClick={onOpen ? (e) => { if (!e.target.closest('[data-card-id], .pile')) onOpen(); } : undefined}
      className={cn('relative min-h-0 flex-1 gap-0 overflow-hidden border-transparent bg-transparent p-3 shadow-none', active && !zoomed && 'border-primary/50', onOpen && 'cursor-zoom-in')}
    >
      {active && !zoomed && <BorderBeam size={120} duration={9} borderWidth={2} colorFrom="#d9b15a" colorTo="#d9b15a00" />}
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

      <div className={wide ? cn('flex items-start gap-6', zoomed && 'flex-wrap') : 'contents'}>
      <div data-dest-tokens={idx} data-dest-cards={idx} className="mt-3 flex items-start gap-3" title="Tokens, with the cards of each colour under them">
        {[...new Set([...kinds(S), 'gold', ...COLORS])].filter((k) => p.tok[k] > 0 || p.cards.some((x) => x.color === k)).map((k) => {
          const click = canReturn ? () => dispatch({ type: 'giveBack', c: k }) : canDisc ? () => dispatch({ type: 'disc', c: k }) : canSteal && k !== 'gold' ? () => dispatch({ type: 'steal', c: k }) : null;
          const owned = p.cards.filter((x) => x.color === k);
          const z = colW / 124;
          const strip = Math.round((zoomed ? 62 : 40) * z);
          const full = Math.round(colW * 1.4);
          const tok = zoomed ? 56 : 32;
          return (
            <div key={k} className="flex shrink-0 flex-col items-center gap-2" style={{ width: colW }}>
              <div title={canReturn ? `Return a ${k} token to the bag` : `${k}: ${p.tok[k]}`} onClick={click} className={cn('flex flex-col-reverse items-center', click && 'pile click')} style={{ minHeight: tok }}>
                {Array.from({ length: p.tok[k] }, (_, i) => (
                  <div key={i} className="leading-none" style={{ marginBottom: i ? (zoomed ? -32 : -18) : 0 }}><TokenArt kind={k} size={tok} /></div>
                ))}
              </div>
              {owned.length > 0 && (
                <div className="compact-cards pointer-events-none relative shrink-0" style={{ width: colW, height: (owned.length - 1) * strip + full, '--z': z }}>
                  {owned.map((card, i) => {
                    const last = i === owned.length - 1;
                    return (
                      <div key={card.id} className="absolute left-0 overflow-hidden rounded-[6px]" style={{ top: i * strip, height: last ? full : strip, width: colW, zIndex: i }}>
                        <JewelCard card={card} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {p.royals.length > 0 && (
        <div>
          <Label>Royal cards</Label>
          <div className="text-xs">{p.royals.map((r) => `${r.pts} pts`).join(', ')}</div>
        </div>
      )}
      {p.cf.length > 0 && (
        <div>
          <Label>Counterfeiters</Label>
          <div className="flex flex-col gap-1">
            {p.cf.map((c) => (
              <span key={c.id} className={cn('border-l-2 border-violet-400 pl-1.5 text-[10px] leading-tight', S.used[c.id] && active && 'opacity-45')}>
                {CF_TEXT[c.ab](c)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div data-dest-res={idx} data-zone="res" className="compact-cards mt-3" style={{ '--z': zoomed ? 0.9 : wide ? 0.68 : 0.52 }}>
        <div className="rowline wrap">
          {Array.from({ length: resCap(p) }, (_, i) => {
            const c = p.res[i];
            if (!c) return <div key={`slot${i}`} className="slot" />;
            return showReserved ? (
              <JewelCard
                key={c.id}
                card={c}
                selected={S.selCard?.src === 'res' && S.selCard.i === i}
                afford={!S.main && !!plan(S, p, c)}
                onClick={() => dispatch({ type: 'card', src: 'res', i })}
              />
            ) : (
              <CardBack key={c.id} level="hidden" />
            );
          })}
        </div>
      </div>
      </div>
    </Card>
  );
}
