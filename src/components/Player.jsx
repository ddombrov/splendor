import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/lib/utils';
import { COLORS, CF_TEXT } from '../engine/data.js';
import { Hand } from 'lucide-react';
import { JewelCard, RoyalCard, CardBack } from './Cards.jsx';
import { TokenArt, Gem, Scroll, Crown } from './Art.jsx';
import { bonuses, colorPts, crowns, kinds, limitCount, plan, pts, resCap, roomLeft } from '../engine/engine.js';

const Label = ({ children }) => (
  <div className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</div>
);
const Stat = ({ title, big, children }) => (
  <div title={title} className={cn('flex items-center gap-1 font-extrabold leading-none', big ? 'h-12 gap-2 text-5xl' : 'h-7 text-xl')}>{children}</div>
);

// Past this many cards of one colour, the small views show the latest few and an ellipsis; the opened view shows them all.
const MAX_STACK = 5;

const TokenStat = ({ p, big }) => {
  const n = limitCount(p);
  return (
    <Stat big={big} title="Tokens held, out of the limit of 10">
      <span className={n >= 10 ? 'text-amber-300' : undefined}>{n}/10</span>
      <Hand size={big ? 40 : 18} className="opacity-80" />
    </Stat>
  );
};

export default function Player({ S, idx, dispatch, onInspect, colW = 52, viewer = null, onOpen = null, zoomed = false, wide = false, summary = false, expanded = false, horizontal = false, compact = false }) {
  const p = S.players[idx];
  const active = idx === S.cur && !S.awaitingFirst;
  const pd = S.pending;
  const mine = viewer == null || viewer === S.cur;
  const showReserved = viewer == null ? active : idx === viewer;
  const canDisc = pd?.type === 'discard' && active && mine;
  const canSteal = pd?.type === 'steal' && !active && mine;
  const canReturn = active && mine && !S.main && !pd && roomLeft(p) === 0;
  const b = bonuses(p);
  const all = [...kinds(S), 'gold'];
  const royals = (z) => p.royals.length > 0 && (
    <div className="compact-cards flex flex-wrap gap-1" style={{ '--z': z }}>
      {p.royals.map((r) => <RoyalCard key={r.id} card={r} onClick={() => onInspect?.(r)} />)}
    </div>
  );
  const reserved = (c, i) => (showReserved ? (
    <JewelCard key={c.id} card={c} selected={S.selCard?.src === 'res' && S.selCard.i === i} afford={!S.main && !!plan(S, p, c)} onClick={() => { onInspect?.(c); dispatch({ type: 'card', src: 'res', i }); }} />
  ) : (
    <CardBack key={c.id} level="hidden" />
  ));

  if (summary && horizontal) {
    const cw = 34;
    const ch = 48;
    const slots = (
      <div data-zone="res" className="compact-cards flex shrink-0 items-center gap-1.5" style={{ '--z': 0.26 }}>
          {Array.from({ length: resCap(p) }, (_, i) => {
            const c = p.res[i];
            if (!c) return <div key={`slot${i}`} className="slot" />;
            return reserved(c, i);
          })}
        </div>
    );
    return (
      <Card data-dest-tokens={idx} data-dest-cards={idx} data-dest-res={idx} className={cn('handboard min-h-0 flex-1 flex-row items-stretch gap-4 overflow-hidden px-4 py-2', active && 'outline outline-2 -outline-offset-4 outline-primary/70')}>
        <div className="flex shrink-0 flex-col justify-center gap-1">
          <h3 className="text-base font-bold">{p.name}</h3>
          <div className="flex items-center gap-3">
            <Stat title="Prestige points"><span>{pts(p)}</span></Stat>
            <Stat title="Crowns"><span>{crowns(p)}</span><Crown size={20} /></Stat>
            <Stat title="Scrolls"><span>{p.priv}</span><Scroll size={22} /></Stat>
            <TokenStat p={p} />
          </div>
          {compact && <div className="mt-1">{slots}</div>}
        </div>
        <div className="flex min-w-0 flex-1 items-start justify-center gap-2 pt-1">
          {all.map((k) => {
            const owned = p.cards.filter((x) => x.color === k);
            const shown = owned.slice(-MAX_STACK);
            const step = shown.length > 1 ? Math.min(16, Math.floor(56 / (shown.length - 1))) : 0;
            return (
              <div key={k} title={`${k}: ${p.tok[k]} tokens${owned.length ? `, ${owned.length} cards` : ''}`} className="flex flex-col items-center gap-0.5" style={{ width: cw }}>
                <TokenArt kind={k} size={26} />
                <span className="text-base font-extrabold leading-none">{p.tok[k]}</span>
                {shown.length > 0 && (
                  <div className="compact-cards relative mt-0.5" style={{ '--z': cw / 124, width: cw, height: ch + step * (shown.length - 1) }}>
                    {shown.map((card, i) => (
                      <div key={card.id} className="absolute left-0 cursor-zoom-in overflow-hidden rounded-[4px]" style={{ top: i * step, width: cw, height: ch, zIndex: i }} onClick={() => onInspect?.(card)}>
                        <JewelCard card={card} />
                      </div>
                    ))}
                  </div>
                )}
                {owned.length > MAX_STACK && <span className="text-sm font-extrabold leading-none text-muted-foreground" title="Open this player to see every card">…</span>}
              </div>
            );
          })}
        </div>
        {p.royals.length > 0 && <div className="flex shrink-0 items-start pt-1">{royals(0.22)}</div>}
        {!compact && slots}
      </Card>
    );
  }

  if (summary) {
    const z = expanded ? 0.5 : 0.22;
    const cw = Math.round(124 * z);
    const ch = Math.round(174 * z);
    return (
      <Card data-dest-tokens={idx} data-dest-cards={idx} data-dest-res={idx} className={cn('handboard min-h-0 flex-1 gap-0 overflow-hidden p-3', active && 'outline outline-2 -outline-offset-4 outline-primary/70')}>
        <h3 className="text-base font-bold">{p.name}</h3>
        <div className="mt-1 flex items-center gap-3">
          <Stat title="Prestige points"><span>{pts(p)}</span></Stat>
          <Stat title="Crowns"><span>{crowns(p)}</span><Crown size={20} /></Stat>
          <Stat title="Scrolls"><span>{p.priv}</span><Scroll size={22} /></Stat>
          <TokenStat p={p} />
        </div>
        <div className={cn('mt-2 flex flex-col', expanded ? 'gap-3' : 'gap-0.5')}>
          {all.map((k) => {
            const owned = p.cards.filter((x) => x.color === k);
            const shown = owned.slice(-MAX_STACK);
            const step = shown.length > 1 ? Math.min(cw, Math.floor((expanded ? 100 : 70) / (shown.length - 1))) : 0;
            return (
              <div key={k} title={`${k}: ${p.tok[k]} tokens${owned.length ? `, ${owned.length} cards` : ''}`} className="flex items-center gap-2">
                <TokenArt kind={k} size={expanded ? 36 : 26} />
                <span className="w-6 text-lg font-extrabold leading-none">{p.tok[k]}</span>
                {shown.length > 0 && (
                  <div className="compact-cards relative shrink-0" style={{ '--z': z, width: cw + step * (shown.length - 1), height: ch }}>
                    {shown.map((card, i) => (
                      <div key={card.id} className="absolute top-0 cursor-zoom-in overflow-hidden rounded-[4px]" style={{ left: i * step, width: cw, height: ch, zIndex: i }} onClick={() => onInspect?.(card)}>
                        <JewelCard card={card} />
                      </div>
                    ))}
                  </div>
                )}
                {owned.length > MAX_STACK && <span className="text-lg font-extrabold leading-none text-muted-foreground" title="Open this player to see every card">…</span>}
              </div>
            );
          })}
        </div>
        {p.royals.length > 0 && <div className="mt-2">{royals(0.22)}</div>}
        <div data-zone="res" className="compact-cards mt-2 flex gap-1.5" style={{ '--z': 0.24 }}>
          {Array.from({ length: resCap(p) }, (_, i) => {
            const c = p.res[i];
            if (!c) return <div key={`slot${i}`} className="slot" />;
            return reserved(c, i);
          })}
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
          <h3 className={cn('font-bold', zoomed ? 'text-3xl' : 'text-base')}>{p.name}</h3>
        </div>
        <div className={cn('flex items-center', zoomed ? 'gap-8' : 'gap-3')}>
          <Stat big={zoomed} title="Prestige points">
            <span>{pts(p)}</span>
          </Stat>
          <Stat big={zoomed} title="Crowns">
            <span>{crowns(p)}</span>
            <Crown size={zoomed ? 46 : 22} />
          </Stat>
          <Stat big={zoomed} title="Scrolls">
            <span>{p.priv}</span>
            <Scroll size={zoomed ? 50 : 24} />
          </Stat>
          <TokenStat p={p} big={zoomed} />
        </div>
      </div>

      <div className={wide ? cn('flex items-start gap-6', zoomed && 'flex-wrap') : 'contents'}>
      <div data-dest-tokens={idx} data-dest-cards={idx} className="mt-3 flex items-start gap-3" title="Tokens, with the cards of each colour under them">
        {all.map((k) => {
          const click = canReturn ? () => dispatch({ type: 'giveBack', c: k }) : canDisc ? () => dispatch({ type: 'disc', c: k }) : canSteal && k !== 'gold' ? () => dispatch({ type: 'steal', c: k }) : null;
          const owned = p.cards.filter((x) => x.color === k);
          const z = colW / 124;
          const full = Math.round(colW * 1.4);
          const strip = owned.length > 1 ? Math.max(10, Math.min(Math.round((zoomed ? 62 : 40) * z), Math.floor((colW * 4.2 - full) / (owned.length - 1)))) : 0;
          const tok = zoomed ? Math.min(colW - 6, 80) : 32;
          return (
            <div key={k} className="flex shrink-0 flex-col items-center gap-2" style={{ width: colW }}>
              <div title={canReturn ? `Return a ${k} token to the bag` : `${k}: ${p.tok[k]}`} onClick={click} className={cn('flex flex-col-reverse items-center', click && 'pile click')} style={{ minHeight: tok }}>
                {Array.from({ length: p.tok[k] }, (_, i) => (
                  <div key={i} className="leading-none" style={{ marginBottom: i ? (zoomed ? -Math.round(tok * 0.57) : -18) : 0 }}><TokenArt kind={k} size={tok} /></div>
                ))}
              </div>
              {owned.length > 0 && (
                <div className="compact-cards relative shrink-0" style={{ width: colW, height: (owned.length - 1) * strip + full, '--z': z }}>
                  {owned.map((card, i) => (
                    <div key={card.id} className="absolute left-0 cursor-zoom-in" style={{ top: i * strip, width: colW, zIndex: i }} onClick={() => onInspect?.(card)}>
                      <JewelCard card={card} />
                    </div>
                  ))}
                </div>
              )}
              {COLORS.includes(k) && (
                <div title={`Points from ${k} cards`} className={cn('font-extrabold leading-none', zoomed ? 'text-3xl' : 'text-lg')}>{colorPts(p, k)}</div>
              )}
            </div>
          );
        })}
      </div>

      {p.royals.length > 0 && (
        <div>
          <Label>Royal cards</Label>
          {royals(zoomed ? 0.6 : 0.4)}
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

      </div>

      <div className="compact-cards mt-auto pt-4" style={{ '--z': zoomed ? 0.9 : wide ? 0.68 : 0.52 }}>
        <div className="rowline wrap">
          {Array.from({ length: resCap(p) }, (_, i) => {
            const c = p.res[i];
            if (!c) return <div key={`slot${i}`} className="slot" />;
            return reserved(c, i);
          })}
        </div>
      </div>
    </Card>
  );
}
