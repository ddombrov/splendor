import { useLayoutEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/lib/utils';
import { COLORS } from '../engine/data.js';
import { JewelCard, CfCard, RoyalCard, CardBack } from './Cards.jsx';
import { TokenArt, Gem, Scroll, Crown, PAL } from './Art.jsx';
import { bonuses, colorPts, crowns, kinds, limitCount, plan, pts, resCap, roomLeft } from '../engine/engine.js';

// The opened hand shows the stats large; everywhere else they stretch across the panel (see .stats in styles.css).
const Stat = ({ title, big, children }) => (
  <div title={title} className={cn('stat flex shrink-0 items-center gap-1 font-extrabold leading-none', big && 'h-14 gap-2 px-4 text-5xl')}>{children}</div>
);
const Stats = ({ p, big }) => (
  <div className={big ? undefined : 'stats'}>
    <div className={cn('flex items-stretch divide-x divide-white/30 rounded-lg border border-white/30 bg-black/25', big ? 'w-fit' : 'w-full')}>
      <Stat big={big} title="Prestige points"><span>{pts(p)}</span><span className={cn('unit font-bold text-muted-foreground', big && 'text-2xl')}>pts</span></Stat>
      <Stat big={big} title="Crowns"><span>{crowns(p)}</span><Crown size={big ? 46 : 16} /></Stat>
      <Stat big={big} title="Scrolls"><span>{p.priv}</span><Scroll size={big ? 50 : 18} /></Stat>
      <TokenStat p={p} big={big} />
    </div>
  </div>
);

// Past this many cards of one colour, the small views show the latest few and an ellipsis; the opened view shows them all.
const MAX_STACK = 5;

const TokenStat = ({ p, big }) => {
  const n = limitCount(p);
  return (
    <Stat big={big} title="Tokens held, out of the limit of 10">
      <span className={n >= 10 ? 'text-amber-300' : undefined}>{n}/10</span>
    </Stat>
  );
};

export default function Player({ S, idx, dispatch, onInspect, colW = 52, viewer = null, buying = false, onOpen = null, zoomed = false, wide = false, summary = false, expanded = false, horizontal = false, compact = false }) {
  const p = S.players[idx];
  const fitRef = useRef(null);
  const handRef = useRef(null);
  const roomKey = `${p.cards.length}|${Object.values(p.tok).join()}|${p.res.length}|${p.royals.length}|${colW}|${zoomed}`;
  const [room, setRoom] = useState({ key: roomKey, v: null });
  const stackRoom = room.key === roomKey ? room.v : null; // the most height the extra cards of one stack may take
  const tallest = useRef(0);
  // Both measurements below adjust the layout and then measure again. A few rounds settle it; if they ever keep
  // going, they stop rather than redraw forever.
  const rounds = useRef({ n: 0, at: 0 });
  const mayAdjust = () => {
    const now = performance.now();
    const r = rounds.current;
    r.n = now - r.at < 200 ? r.n + 1 : 0;
    r.at = now;
    return r.n < 12;
  };
  useLayoutEffect(() => {
    const el = handRef.current?.parentElement; // the hand's card, which clips anything that does not fit
    if (!el) return;
    const over = el.scrollHeight - el.clientHeight;
    if (over <= 1 || tallest.current <= 0) return;
    const v = Math.max(0, tallest.current - over - 4);
    if (v !== stackRoom && mayAdjust()) setRoom({ key: roomKey, v });
  });
  const [fit, setFit] = useState(1);
  useLayoutEffect(() => {
    const el = fitRef.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const k = box.getBoundingClientRect().height / (box.offsetHeight || 1);
    const cs = getComputedStyle(box);
    const slots = box.querySelector('[data-zone=res]');
    // the room from the top of the scaled part down to the reserved cards
    const avail = box.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom) * k - (slots ? slots.getBoundingClientRect().height : 0) - el.getBoundingClientRect().top;
    const used = el.getBoundingClientRect().height;
    if (avail <= 0 || !used) return;
    const next = Math.max(0.45, Math.min(1, fit * (avail / used) * 0.985));
    if (Math.abs(next - fit) > 0.01 && mayAdjust()) setFit(next);
  });
  const active = idx === S.cur && !S.awaitingFirst;
  const pd = S.pending;
  const mine = viewer == null || viewer === S.cur;
  const showReserved = viewer == null ? active : idx === viewer;
  const canDisc = pd?.type === 'discard' && active && mine;
  const canSteal = pd?.type === 'steal' && !active && mine;
  const canReturn = active && mine && !S.main && !pd && roomLeft(p) === 0;
  const wildColors = pd?.type === 'wild' && active && mine ? pd.colors : [];
  const b = bonuses(p);
  const all = [...kinds(S), 'gold'];
  // Counterfeiter cards are paid for with glassware, so they stack under the glassware tokens; one whose power
  // was used this turn is faded.
  const ownedOf = (k) => (k === 'glass' ? p.cf : p.cards.filter((x) => (k === 'gold' ? x.bonus === 'none' : x.color === k)));
  const ownedCard = (card) => (card.kind === 'cf' ? <div className={cn(S.used[card.id] && active && 'opacity-45')}><CfCard card={card} /></div> : <JewelCard card={card} />);
  const royals = (z) => p.royals.length > 0 && (
    <div className="compact-cards flex flex-wrap gap-1" style={{ '--z': z }}>
      {p.royals.map((r) => <RoyalCard key={r.id} card={r} onClick={() => onInspect?.(r)} />)}
    </div>
  );
  const reserved = (c, i) => (showReserved ? (
    <JewelCard key={c.id} card={c} selected={S.selCard?.src === 'res' && S.selCard.i === i} afford={buying && idx === S.cur && !!plan(S, p, c)} onClick={() => { onInspect?.(c); dispatch({ type: 'card', src: 'res', i }); }} />
  ) : (
    <CardBack key={c.id} level="hidden" />
  ));

  if (summary && horizontal) {
    const cw = 31;
    const ch = 47;
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
      <Card data-dest-tokens={idx} data-dest-cards={idx} data-dest-res={idx} className={cn('handboard min-h-0 flex-1 flex-row items-stretch gap-2.5 overflow-hidden px-3 py-2', active && 'outline outline-[3px] -outline-offset-3 outline-[#ffd25e]')}>
        <div className="flex shrink-0 flex-col justify-center gap-1" style={{ width: 'clamp(160px, 30%, 300px)' }}>
          <h3 className="text-base font-bold">{p.name}</h3>
          <Stats p={p} />
          {compact && <div className="mt-1">{slots}</div>}
        </div>
        <div className="flex min-w-0 flex-1 items-start gap-1 pt-1" style={{ justifyContent: 'safe center' }}>
          {all.map((k) => {
            const owned = ownedOf(k);
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
                        {ownedCard(card)}
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
    const ch = Math.round(189 * z);
    return (
      <Card data-dest-tokens={idx} data-dest-cards={idx} data-dest-res={idx} className={cn('handboard min-h-0 flex-1 gap-0 overflow-hidden p-3', active && 'outline outline-[3px] -outline-offset-3 outline-[#ffd25e]')}>
        <h3 className="shrink-0 text-base font-bold">{p.name}</h3>
        <div className="mt-1 shrink-0"><Stats p={p} /></div>
        <div ref={fitRef} className="shrink-0" style={{ zoom: fit }}>
        <div className={cn('mt-2 flex flex-col', expanded ? 'gap-3' : 'gap-0.5')}>
          {all.map((k) => {
            const owned = ownedOf(k);
            const shown = owned.slice(-MAX_STACK);
            const step = shown.length > 1 ? Math.min(cw, Math.floor((expanded ? 100 : 70) / (shown.length - 1))) : 0;
            return (
              <div key={k} title={`${k}: ${p.tok[k]} tokens${owned.length ? `, ${owned.length} cards` : ''}`} className="flex items-center gap-2" style={{ height: ch }}>
                <TokenArt kind={k} size={expanded ? 36 : 26} />
                <span className="w-6 text-lg font-extrabold leading-none">{p.tok[k]}</span>
                {shown.length > 0 && (
                  <div className="compact-cards relative shrink-0" style={{ '--z': z, width: cw + step * (shown.length - 1), height: ch }}>
                    {shown.map((card, i) => (
                      <div key={card.id} className="absolute top-0 cursor-zoom-in overflow-hidden rounded-[4px]" style={{ left: i * step, width: cw, height: ch, zIndex: i }} onClick={() => onInspect?.(card)}>
                        {ownedCard(card)}
                      </div>
                    ))}
                  </div>
                )}
                
                {owned.length > MAX_STACK && <span className="text-lg font-extrabold leading-none text-muted-foreground" title="Open this player to see every card">…</span>}
              </div>
            );
          })}
        </div>
        </div>
        <div data-zone="res" className="compact-cards mt-auto flex items-end gap-1.5 pt-2" style={{ '--z': 0.24 }}>
          {Array.from({ length: resCap(p) }, (_, i) => {
            const c = p.res[i];
            if (!c) return <div key={`slot${i}`} className="slot" />;
            return reserved(c, i);
          })}
          {p.royals.length > 0 && <div className="ml-auto">{royals(0.24)}</div>}
        </div>
      </Card>
    );
  }

  tallest.current = 0;
  return (
    <Card
      onClick={onOpen ? (e) => { if (!e.target.closest('[data-card-id], .pile')) onOpen(); } : undefined}
      className={cn('relative min-h-0 flex-1 gap-0 overflow-hidden border-transparent bg-transparent p-3 shadow-none', active && !zoomed && 'border-primary/50', onOpen && 'cursor-zoom-in')}
    >
      {active && !zoomed && <BorderBeam size={120} duration={9} borderWidth={2} colorFrom="#d9b15a" colorTo="#d9b15a00" />}
      <div ref={handRef} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex items-center gap-2">
          <h3 className={cn('font-bold', zoomed ? 'text-3xl' : 'text-base')}>{p.name}</h3>
        </div>
        <Stats p={p} big={zoomed} />
      </div>

      <div className={wide ? cn('flex items-start gap-6', zoomed && 'flex-wrap') : 'contents'}>
      <div data-dest-tokens={idx} data-dest-cards={idx} className="mt-3 flex items-start gap-3" title="Tokens, with the cards of each colour under them">
        {all.map((k) => {
          const click = canReturn ? () => dispatch({ type: 'giveBack', c: k }) : canDisc ? () => dispatch({ type: 'disc', c: k }) : canSteal && k !== 'gold' ? () => dispatch({ type: 'steal', c: k }) : null;
          const wildPick = wildColors.includes(k) ? () => dispatch({ type: 'wild', c: k }) : null;
          const owned = ownedOf(k);
          const z = colW / 124;
          const full = Math.round(colW * 1.525);
          const strip = owned.length > 1 ? Math.max(stackRoom == null ? 10 : 4, Math.min(Math.round((zoomed ? 62 : 40) * z), Math.floor((stackRoom ?? colW * 4.2 - full) / (owned.length - 1)))) : 0;
          tallest.current = Math.max(tallest.current, strip * (owned.length - 1));
          const tok = zoomed ? Math.min(colW - 6, 80) : 32;
          return (
            <div key={k} className={cn('flex shrink-0 flex-col items-center gap-2', wildPick && 'wildpick')} style={{ width: colW, '--pick': PAL[k].glow }} onClick={wildPick ?? undefined} title={wildPick ? `Copy ${k}` : undefined}>
              {zoomed && (
                <div className="flex items-center gap-2" title={`${k}: ${p.tok[k]} tokens`}>
                  <TokenArt kind={k} size={Math.max(30, Math.round(colW * 0.36))} />
                  <span className="font-extrabold leading-none" style={{ fontSize: Math.max(22, Math.round(colW * 0.28)) }}>{p.tok[k]}</span>
                </div>
              )}
              <div title={canReturn ? `Return a ${k} token to the bag` : `${k}: ${p.tok[k]}`} onClick={click} className={cn('flex flex-col-reverse items-center', click && 'pile click')} style={{ minHeight: zoomed ? 0 : tok }}>
                {Array.from({ length: p.tok[k] }, (_, i) => (
                  <div key={i} className="leading-none" style={{ marginBottom: i ? (zoomed ? -Math.round(tok * 0.57) : -18) : 0 }}><TokenArt kind={k} size={tok} /></div>
                ))}
              </div>
              {owned.length > 0 && (
                <div className="compact-cards relative shrink-0" style={{ width: colW, height: (owned.length - 1) * strip + full, '--z': z }}>
                  {owned.map((card, i) => (
                    <div key={card.id} className="absolute left-0 cursor-zoom-in" style={{ top: i * strip, width: colW, zIndex: i }} onClick={() => onInspect?.(card)}>
                      {ownedCard(card)}
                    </div>
                  ))}
                </div>
              )}
              {owned.length > 0 && (
                <div className="flex items-center gap-2">
                  {COLORS.includes(k) && <div title={`Points from ${k} cards`} className={cn('font-extrabold leading-none', zoomed ? 'text-3xl' : 'text-lg')}>{colorPts(p, k)} <span className={cn('font-bold text-muted-foreground', zoomed ? 'text-lg' : 'text-[10px]')}>pts</span></div>}
                  
                </div>
              )}
            </div>
          );
        })}
      </div>


      </div>

      <div className="compact-cards mt-auto pt-4" style={{ '--z': zoomed ? 0.9 : wide ? 0.68 : 0.52 }}>
        <div className="rowline wrap items-end">
          {Array.from({ length: resCap(p) }, (_, i) => {
            const c = p.res[i];
            if (!c) return <div key={`slot${i}`} className="slot" />;
            return reserved(c, i);
          })}
          {p.royals.length > 0 && <div className="ml-auto">{royals(zoomed ? 0.9 : wide ? 0.68 : 0.52)}</div>}
        </div>
      </div>
    </Card>
  );
}
