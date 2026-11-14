import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { Check, Copy, Loader2, ListChecks, History, ChevronDown, TriangleAlert, CircleCheck, Circle, Swords, ScrollText, RefreshCw, Hand, Bookmark, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { api } from './net/api.js';
import { botActions } from './engine/bot.js';
import { perkText } from './engine/data.js';
import { createGame, reduce, cur, opp, plan, canReplenish, endOptions, validLine, selectedCard, resCap } from './engine/engine.js';
import { JewelCard, CfCard, RoyalCard, CardBack } from './components/Cards.jsx';
import Player from './components/Player.jsx';
import Rules from './components/Rules.jsx';
import { TokenArt, Scroll, Gem, Mini, CompleteIcon, Pic } from './components/Art.jsx';
import { computeLayout } from './layout.js';
import { Flights, diffFlights, takeSnapshot } from './motion.jsx';
import CoinFlip from './components/CoinFlip.jsx';

// The engine is deterministic, so the screen supplies the seed for each new game.
const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

// A card just dealt from the deck shows its back and turns over to its face.
function Dealt({ fresh, level, children }) {
  if (!fresh) return children;
  return (
    <div className="dealt">
      {children}
      <div className="dealtback"><CardBack level={level} /></div>
    </div>
  );
}

function statusText(S) {
  const p = cur(S), pd = S.pending;
  if (S.toast) return S.toast;
  if (pd) {
    switch (pd.type) {
      case 'pick': return `${p.name}: take a token from the board (highlighted).${pd.plus ? ' You may take 2 of the matching colour, or any 1 token.' : ''}`;
      case 'multi': return `${p.name}: choose up to ${pd.max} token${pd.max > 1 ? 's' : ''}${pd.rule === 'same' ? ' of one type' : ''}, then confirm.`;
      case 'steal': return `${p.name}: click one of ${opp(S).name}'s tokens to steal it.`;
      case 'royal': return `${p.name}: choose a royal card.`;
      case 'discard': return `${p.name}: more than 10 tokens. Click your tokens to discard down to 10.`;
      case 'wild': return `${p.name}: choose the colour for your wild bonus.`;
      case 'freeReserve': return `${p.name}: click a card or deck to reserve it, or skip.`;
      case 'freeCf': return `${p.name}: take a counterfeiter card for free.`;
      case 'endabil': return `${p.name}: use a counterfeiter ability, or finish your turn.`;
      case 'peek': return `${p.name}: choose 1 of these 3 cards to reserve.`;
      default: break;
    }
  }
  if (S.mode === 'priv') return `${p.name}: click any non-gold token to take it with your privilege.`;
  if (S.mode === 'priv2') return `${p.name}: counterfeiter bonus, click one more non-gold token.`;
  if (S.sel.length === 2 && !validLine(S, S.sel)) return `${p.name}: pick the token between these two to take 3 in a line, or choose different tokens.`;
  if (S.goldSel != null) return `${p.name}: gold token chosen. Choose a card or deck to reserve, then press Complete move.`;
  return null;
}

function Token({ kind, cls, onClick, size }) {
  return (
    <div className={`tok ${cls || ''}`} onClick={onClick}>
      <TokenArt kind={kind} size={size} />
    </div>
  );
}

const SectionLabel = ({ children, className }) => (
  <div className={cn('text-[11px] font-semibold uppercase tracking-widest text-muted-foreground', className)}>{children}</div>
);
const ButtonRow = ({ children, className }) => (
  <div className={cn('flex flex-wrap justify-center gap-2', className)}>{children}</div>
);

// The window size, kept up to date. src/layout.js turns it into the layout.
function useViewport() {
  const read = () => ({ vw: window.innerWidth, vh: window.innerHeight });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const onResize = () => setVp(read());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize); };
  }, []);
  return vp;
}

const freshGame = (session) => {
  const g = createGame(session.exp, newSeed(), null);
  if (session.mode === 'ai') g.players[1].name = 'Computer';
  return g;
};

/** Loads an online game from the server, then hands it to the board. */
export default function Game({ session, onExit }) {
  const online = session.mode === 'online';
  const [init, setInit] = useState(() => (online ? null : { S: freshGame(session), rev: 0 }));
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!online) return;
    api.getRoom(session.code).then((room) => (room ? setInit({ S: room.S, rev: room.rev }) : setGone(true)));
  }, [online, session.code, session.seat]);
  if (gone) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold">This game no longer exists.</p>
        <Button onClick={onExit}>Back to home</Button>
      </div>
    );
  }
  if (!init) {
    return <div className="fixed inset-0 flex items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }
  return <Board session={session} onExit={onExit} init={init} />;
}

const ago = (t) => {
  if (!t) return 'not yet';
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  return `${Math.floor(sec / 3600)} h ago`;
};

function Board({ session, onExit, init }) {
  const vp = useViewport();
  const { exp } = session;
  const online = session.mode === 'online';
  const vsAi = session.mode === 'ai';
  const seat = online ? session.seat : vsAi ? 0 : null; // whose screen this is; null means both players share it
  const [S, setS] = useState(init.S);
  const Sref = useRef(init.S);
  const revRef = useRef(init.rev);
  const [remote, setRemote] = useState(null);
  const [, setTick] = useState(0);
  const [copied, setCopied] = useState(false);
  const [coin, setCoin] = useState(null);

  const adopt = useCallback((next, rev) => { Sref.current = next; revRef.current = rev; setS(next); }, []);
  // Online, every action goes to the server, which runs the rules and answers with the latest game.
  // Actions are sent one after another so the server always sees them in order.
  const queue = useRef(Promise.resolve());
  const send = useCallback((action) => {
    queue.current = queue.current.then(async () => {
      try {
        const res = await api.sendAction(session.code, revRef.current, action);
        if (res.S) adopt(res.message ? { ...res.S, toast: res.message } : res.S, res.rev);
      } catch { /* the connection dropped; the next poll catches up */ }
    });
  }, [session.code, adopt]);

  /** Every change to the game goes through here, so the rules about whose turn it is live in one place. */
  const dispatch = useCallback((a) => {
    const before = Sref.current;
    if (seat != null && a.type !== 'resign') {
      const mine = before.awaitingFirst ? (a.type === 'chooseFirst' && (!online || seat === 0)) : before.cur === seat;
      if (!mine) return;
    }
    if (online) { send(a); return; }
    const next = reduce(before, a);
    if (next === before) return;
    Sref.current = next;
    setS(next);
  }, [seat, online, send]);

  // Online: ask the server for the other player's moves every two seconds.
  useEffect(() => {
    if (!online) return undefined;
    const pull = async () => {
      const room = await api.getRoom(session.code);
      if (!room) return;
      setRemote({ active: room.active, seated: room.seated });
      if (room.rev > revRef.current) adopt(room.S, room.rev);
    };
    pull();
    const id = setInterval(() => { pull(); setTick((t) => t + 1); }, 2000);
    return () => clearInterval(id);
  }, [online, session.code, adopt]);

  // Against the computer: it plays seat 1 after a short pause. It first shows what it has picked
  // (tokens or a card highlighted), then confirms the move a moment later.
  const botWaiting = useRef(false);
  useEffect(() => {
    if (!vsAi || S.over || S.awaitingFirst || S.cur !== 1 || botWaiting.current) return undefined;
    const t = setTimeout(() => {
      const acts = botActions(Sref.current);
      if (!acts.length) return;
      let next = Sref.current;
      for (const a of acts.slice(0, -1)) next = reduce(next, a);
      const last = acts.at(-1);
      if (next === Sref.current) { next = reduce(next, last); Sref.current = next; setS(next); return; }
      Sref.current = next;
      setS(next);
      botWaiting.current = true;
      setTimeout(() => {
        botWaiting.current = false;
        if (Sref.current !== next) return; // the game was restarted or left in the meantime
        const done = reduce(next, last);
        Sref.current = done;
        setS(done);
      }, 1000);
    }, 700);
    return () => clearTimeout(t);
  }, [S, vsAi]);

  // Things that move between the board and a player's inventory fly there instead of jumping.
  const prevS = useRef(null);
  const snapshot = useRef({ cells: {}, cards: {} });
  const nextFlight = useRef(1);
  const [flights, setFlights] = useState([]);
  const [dealt, setDealt] = useState([]);
  useLayoutEffect(() => {
    const before = prevS.current;
    if (before && before !== S && S.log.length >= before.log.length) {
      const found = diffFlights(before, S, snapshot.current);
      if (found.length) setFlights((list) => [...list, ...found.map((f) => ({ ...f, id: nextFlight.current++ }))]);
    }
    if (before && before !== S && S.log.length >= before.log.length) {
      const old = new Set(before.pyr.flat().map((c) => c?.id));
      setDealt(S.pyr.flat().filter((c) => c && !old.has(c.id)).map((c) => c.id));
    }
    prevS.current = S;
    snapshot.current = takeSnapshot();
  }, [S]);
  const hiding = flights.filter((f) => f.type === 'refill').map((f) => f.cell);
  const landed = useCallback((id) => setFlights((list) => list.filter((f) => f.id !== id)), []);

  const myTurn = seat == null || (S.awaitingFirst ? seat === 0 : S.cur === seat);
  const [showRules, setShowRules] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [ask, setAsk] = useState(null);
  const [lastAsk, setLastAsk] = useState(null);
  const [picked, setPicked] = useState(null);
  // Clicking a card also shows what its perk does in the hint; clicking anywhere else, or moving on, clears it.
  const [inspect, setInspect] = useState(null);
  useEffect(() => { setInspect(null); }, [S.log.length]);
  const look = (card, fn) => () => { setInspect(card); fn?.(); };
  // A turn starts with the optional actions (replenish, use a privilege) and moves on to the main action when skipped.
  const [skipped, setSkipped] = useState(false);
  useEffect(() => { setSkipped(false); }, [S.cur, S.over, S.awaitingFirst]);
  const privCount = S.players[S.cur].priv;
  const lastPriv = useRef({ cur: S.cur, n: privCount });
  useEffect(() => {
    if (lastPriv.current.cur === S.cur && privCount < lastPriv.current.n) setSkipped(true); // a privilege was just used
    lastPriv.current = { cur: S.cur, n: privCount };
  }, [S.cur, privCount]);
  const noOptional = !canReplenish(S) && !(S.players[S.cur].priv > 0 || S.mode === 'priv2');
  const past = skipped || noOptional; // the optional step is over, by choice or because there is nothing to choose
  const locked = !past && !S.mode && !S.pending && !S.awaitingFirst;
  const guard = (fn) => (locked ? undefined : fn);
  const p = cur(S), pd = S.pending;
  // Layout numbers. The cards get the size their rows allow, the board takes what is left, and any
  // spare width goes to the players, the cards and the board in that order of need.
  const prompt = statusText(S);
  const perk = perkText(inspect);
  const { mode, players, stripH, k, w, h, sideW, cardsW, cardZoom, boardColW, cell } = computeLayout({ ...vp, exp: S.exp });
  const strip = players === 'top';
  const tall = mode === 'tall';
  const colW = 64;
  const card = selectedCard(S);
  const act = (a) => () => dispatch(a);

  // Both players sit in one column left of the board, equal in height. Hovering one lets it take over the whole column.
  const [hovered, setHovered] = useState(null);
  // While you must steal a token, the opponent's hand stays open so you can pick from it.
  const shownHand = pd?.type === 'steal' && myTurn ? 1 - S.cur : hovered;
  const playersColumn = (
    <div className={cn('relative min-h-0', tall ? 'order-2 grid grid-cols-2 gap-3' : strip ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3')} style={strip ? { gridColumn: '1 / -1', height: stripH } : undefined} onMouseLeave={() => setHovered(null)}>
      {[0, 1].map((i) => (
        <div key={i} className="flex min-h-0 flex-1 flex-col" onMouseEnter={() => setHovered(i)}>
          <Player S={S} idx={i} dispatch={dispatch} colW={colW} viewer={seat} summary horizontal={strip} />
        </div>
      ))}
      {shownHand != null && (
        <div
          className="handboard absolute z-30 p-4"
          style={tall
            ? { left: -10, right: -10, bottom: -10, height: `calc(100% + ${Math.round(cell * 6.692) + 32}px)`, backgroundColor: '#17403a' }
            : strip
              ? { left: -10, top: -10, height: stripH + 12 + Math.round(cell * 6.692) + 52, width: boardColW + 22, backgroundColor: '#17403a' }
              : { left: -10, top: -10, height: 'calc(100% + 20px)', width: sideW + 12 + boardColW + 20, backgroundColor: '#17403a' }}
        >
          <div className="flex h-full flex-col" style={{ width: tall ? '100%' : strip ? boardColW : sideW + 12 + boardColW - 12 }}>
            <Player S={S} idx={shownHand} dispatch={dispatch} colW={Math.floor(((tall ? w - 20 : strip ? boardColW + 12 : sideW + 12 + boardColW) - 12 - 6 * 12) / 7)} viewer={seat} zoomed wide />
            {pd?.type === 'steal' && prompt && (
              <div className="hintbox mt-3 flex min-h-[90px] shrink-0 items-center px-8 py-5 text-base font-bold leading-snug text-white">{prompt}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  useEffect(() => {
    if (S.over) confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 }, colors: ['#d9b15a', '#5b8bd6', '#4aa174', '#d8283a', '#ffffff'] });
  }, [S.over]);

  const openAsk = (a) => { setLastAsk(a); setAsk(a); };
  const restart = () => openAsk({ title: 'Start over?', msg: 'The current game will be lost.', yes: 'Start over', onYes: () => adopt(freshGame(session), 0) });
  const leave = () => openAsk({ title: 'Leave this game?', msg: online ? 'You can come back with the game code while it still exists.' : 'The current game will be lost.', yes: 'Leave', onYes: onExit });
  const resign = () => openAsk({ title: 'Resign?', msg: 'The other player wins.', yes: 'Resign', onYes: () => dispatch({ type: 'resign', player: seat ?? S.cur }) });
  const copyCode = () => {
    try { navigator.clipboard.writeText(session.code); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const opponentActive = remote ? ago(remote.active[1 - seat]) : '';

  const idle = !S.main && !pd && myTurn;
  const plans = (c) => idle && !locked && !!plan(S, p, c);
  const canBuy = idle && card && !!plan(S, p, card);
  const reservableSel = !!S.selCard && (S.selCard.src === 'pyr' || S.selCard.src === 'deck') && p.res.length < resCap(p);
  const goldChosen = S.goldSel != null;
  const canRes = idle && goldChosen && reservableSel;
  const takeable = idle && validLine(S, S.sel);
  // The action in progress comes from what the player has chosen, or from the button they pressed.
  const action = S.sel.length ? 'take' : S.goldSel != null ? 'reserve' : S.mode ? 'priv' : picked || (card ? 'buy' : null);
  const canComplete = { take: takeable, buy: canBuy, reserve: canRes, refill: idle && canReplenish(S), priv: false }[action];
  const complete = () => {
    const type = { take: 'take', buy: 'buy', reserve: 'reserve', refill: 'repl' }[action];
    setPicked(null);
    if (action === 'refill') setSkipped(true);
    dispatch({ type });
  };
  const cancel = () => { setPicked(null); dispatch({ type: 'cancelAction' }); };
  const choose = (what) => {
    dispatch({ type: 'cancelAction' });
    if (what === 'priv') dispatch({ type: 'priv' });
    else setPicked(what);
  };
  const endOpts = pd?.type === 'endabil' ? endOptions(S) : [];
  const selIdx = pd?.type === 'multi' ? pd.sel : S.goldSel != null ? [...S.sel, S.goldSel] : S.sel;
  const shownAsk = ask || lastAsk;

  // The buttons that sit in the slots along the bottom of the board.
  const extras = [
    pd?.type === 'multi' && { label: `Confirm ${pd.sel.length} token${pd.sel.length === 1 ? '' : 's'}`, onClick: act({ type: 'confirmMulti' }), go: true },
    (['freeReserve', 'freeCf'].includes(pd?.type) || (pd?.type === 'pick' && pd.plus)) && { label: 'Skip', onClick: act({ type: 'skip' }) },
  ].filter(Boolean);
  const buttons = extras.length ? extras : action ? [
    ...(action !== 'priv' ? [{ label: { take: 'Take tokens', buy: 'Buy card', reserve: 'Reserve card', refill: 'Replenish' }[action], disabled: !canComplete, onClick: complete, go: true }] : []),
    { label: 'Cancel', disabled: !idle, onClick: cancel, col: action !== 'priv' ? undefined : 2 },
  ] : past ? [
    { label: 'Take', disabled: !idle, onClick: () => choose('take') },
    { label: 'Reserve', disabled: !(idle && S.board.includes('gold') && p.res.length < resCap(p)), onClick: () => choose('reserve') },
  ] : [
    { label: 'Replenish', disabled: !(idle && canReplenish(S)), onClick: () => choose('refill') },
    { label: 'Use privilege', disabled: !(idle && (p.priv > 0 || S.mode === 'priv2')), onClick: () => choose('priv') },
    { label: 'Skip', disabled: !idle, onClick: () => setSkipped(true) },
  ];
  const slots = !extras.length && !action && !past ? 'three' : 'two';

  return (
    <>
      <div className={cn('fixed inset-0', tall ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden')}>
        <div>
          <div className="stage relative flex flex-col gap-2 p-2.5" onClick={(e) => { if (!e.target.closest('[data-card-id]')) setInspect(null); }} style={tall ? { width: w, minHeight: h, zoom: k, '--cell': `${cell}px` } : { width: w, height: h, transform: `scale(${k})`, transformOrigin: '0 0', '--cell': `${cell}px` }}>
            <div className={cn('z-30 flex items-center gap-1.5', tall ? 'justify-end' : 'absolute right-3 top-3')} style={strip ? { top: stripH + 24 } : undefined}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-11 gap-2.5 px-5 text-base text-white hover:bg-white/10 hover:text-white"><Pic name="settings" size={26} /> Settings <ChevronDown className="size-5 opacity-60" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  {online && (
                    <>
                      <div className="flex items-center justify-between gap-3 px-2 py-2 text-sm">
                        <span className="text-muted-foreground">Code</span>
                        <span className="font-bold tracking-[0.2em]">{session.code}</span>
                        <button type="button" onClick={(e) => { e.preventDefault(); copyCode(); }} className="text-muted-foreground hover:text-foreground" title="Copy the code">
                          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                        </button>
                      </div>
                      <div className="px-2 pb-2 text-xs text-muted-foreground">{remote && !remote.seated ? 'Waiting for opponent' : `Opponent ${opponentActive}`}</div>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onSelect={() => setShowLog(true)} className="gap-2 py-2.5"><Pic name="log" size={20} /> Log</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setShowRules(true)} className="gap-2 py-2.5"><Pic name="rules" size={20} /> Rules</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {!online && <DropdownMenuItem onSelect={restart} className="gap-2 py-2.5"><Pic name="go-again" size={20} /> Start over</DropdownMenuItem>}
                  <DropdownMenuItem onSelect={resign} className="gap-2 py-2.5"><Pic name="resign" size={20} /> Resign</DropdownMenuItem>
                  <DropdownMenuItem onSelect={leave} className="gap-2 py-2.5"><Pic name="leave-game" size={20} /> Leave game</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className={cn('grid gap-3', !tall && 'min-h-0 flex-1')} style={{ gridTemplateColumns: tall ? 'minmax(0,1fr)' : strip ? `minmax(0,1fr) ${cardsW}px` : `${sideW}px minmax(0,1fr) ${cardsW}px`, gridTemplateRows: strip ? `${stripH}px minmax(0,1fr)` : undefined }}>
              {playersColumn}
              {/* Middle: the board, with the selected card underneath */}
              <div className={cn('flex min-h-0 flex-col items-center gap-3', tall && 'order-1')}>
                <div className={cn('board-wrap', slots)}>
                  <div className="board">
                    {S.board.map((c, i) => {
                      let cls = selIdx.includes(i) ? 'sel' : '';
                      if (pd?.type === 'pick') cls += c === pd.color || (pd.plus && c !== 'gold' && pd.left === 2) ? ' hl' : ' dim';
                      else if (pd?.type === 'multi') cls += c === 'gold' ? ' dim' : '';
                      else if (pd) cls += ' dim';
                      return (
                        <div className={cn('cell', selIdx.includes(i) && 'picked')} data-cell={i} key={i}>
                          {c && <div className={hiding.includes(i) ? 'invisible' : undefined}><Token kind={c} cls={cls} size={Math.round(cell * 0.85)} onClick={guard(() => dispatch({ type: 'tok', i }))} /></div>}
                        </div>
                      );
                    })}
                  </div>
                  <div className={cn('boardbtns', slots)} style={{ fontSize: cell * 0.125 }}>
                    {buttons.map((b) => (
                      <button key={b.label} type="button" disabled={b.disabled} onClick={b.onClick} className={cn('woodbtn', b.go && 'go')} style={b.col ? { gridColumn: b.col } : undefined}>
                        {b.go && !b.disabled && <CompleteIcon size={cell * 0.18} />}{b.label}
                      </button>
                    ))}
                  </div>
                  <div className="boardscrolls" title="Scrolls on the table">
                    {Array.from({ length: S.privBoard }, (_, i) => <Scroll key={i} size={Math.round(cell * 0.42)} />)}
                  </div>
                </div>

                {(perk || prompt) && (
                  <div className={cn('hintbox flex min-h-[110px] flex-1 items-center px-8 py-6 text-base font-bold leading-snug', S.toast && !perk ? 'text-amber-300' : 'text-white')} style={{ width: cell * 5.9615 }}>
                    {perk ?? prompt}
                  </div>
                )}
              </div>

              {/* Right: all the cards */}
              <Card data-zone="pyr" className={cn('compact-cards min-h-0 gap-3 overflow-hidden p-0 border-0 bg-transparent shadow-none', tall ? 'order-3' : '-mt-0.5')} style={{ '--z': cardZoom }}>
                <div className="rowline">
                  {S.royals.map((r, i) => (
                    <RoyalCard key={r.id} card={r} glow={pd?.type === 'royal'} onClick={look(r, () => dispatch({ type: 'royal', i }))} />
                  ))}
                  {!S.royals.length && <span className="text-xs text-muted-foreground">All claimed</span>}
                </div>
                {S.exp && (
                  <div className="rowline">
                    <CardBack level="cf" label="CF" count={S.cdeck.length} onClick={guard(() => dispatch({ type: 'card', src: 'cdeck' }))} />
                    {S.crow.map((c, i) => (
                      <CfCard key={c.id} card={c} selected={S.selCard?.src === 'cf' && S.selCard.i === i}
                        afford={plans(c) || pd?.type === 'freeCf'} onClick={look(c, guard(() => dispatch({ type: 'card', src: 'cf', i })))} />
                    ))}
                  </div>
                )}
                {[2, 1, 0].map((l) => (
                  <div className="rowline" key={l}>
                    <CardBack level={l + 1} label={`L${l + 1}`} count={S.decks[l].length} onClick={guard(() => dispatch({ type: 'card', src: 'deck', l }))} />
                    {S.pyr[l].map((c, i) => (
                      <Dealt key={c.id} fresh={dealt.includes(c.id)} level={l + 1}>
                        <JewelCard card={c} selected={S.selCard?.src === 'pyr' && S.selCard.l === l && S.selCard.i === i}
                          afford={plans(c)} onClick={look(c, guard(() => dispatch({ type: 'card', src: 'pyr', l, i })))} />
                      </Dealt>
                    ))}
                  </div>
                ))}
                {pd?.type === 'wild' && (
                  <ButtonRow>
                    {pd.colors.map((c) => <Button key={c} size="sm" variant="outline" onClick={act({ type: 'wild', c })}><Gem kind={c} size={16} /> {c}</Button>)}
                  </ButtonRow>
                )}
                {pd?.type === 'endabil' && (
                  <ButtonRow>
                    {endOpts.map((o) => <Button key={o.k} size="sm" variant="outline" onClick={act({ type: 'endabil', k: o.k })}>{o.t}</Button>)}
                    <Button size="sm" onClick={act({ type: 'endDone' })}>Done</Button>
                  </ButtonRow>
                )}
                {pd?.type === 'peek' && (
                  <div className="rowline">
                    {pd.cards.map((c, i) => <JewelCard key={c.id} card={c} afford onClick={() => dispatch({ type: 'peekPick', i })} />)}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      {createPortal(<Flights flights={flights} onLanded={landed} />, document.body)}
      {showRules && <Rules exp={exp} onClose={() => setShowRules(false)} />}

      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Game log</DialogTitle><DialogDescription>Most recent first.</DialogDescription></DialogHeader>
          <ScrollArea className="h-[50vh] pr-3">
            <ul className="space-y-1.5 text-sm">
              {S.log.map((l, i) => <li key={i} className={i === 0 ? 'text-foreground' : 'text-muted-foreground'}>{l}</li>)}
            </ul>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ask} onOpenChange={(o) => !o && setAsk(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{shownAsk?.title}</DialogTitle><DialogDescription>{shownAsk?.msg}</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAsk(null)}>Cancel</Button>
            <Button onClick={() => { const f = ask.onYes; setAsk(null); f(); }}>{shownAsk?.yes}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={S.awaitingFirst && !S.over} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Who goes first?</DialogTitle>
            <DialogDescription className="sr-only">Choose who goes first</DialogDescription>
          </DialogHeader>
          {online && seat !== 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Waiting for Player 1 to choose.</p>
          ) : coin ? (
            <CoinFlip winner={coin.winner} names={[S.players[0].name, S.players[1].name]} onDone={() => { const w = coin.winner; setCoin(null); dispatch({ type: 'chooseFirst', player: w }); }} />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <Button key={i} variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => dispatch({ type: 'chooseFirst', player: i })}>
                    <span className="text-base font-semibold">{S.players[i].name} goes first</span>
                    <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                      <Scroll size={22} /> {S.players[1 - i].name} gets a scroll
                    </span>
                  </Button>
                ))}
              </div>
              <Button variant="secondary" className="w-full" onClick={() => setCoin({ winner: crypto.getRandomValues(new Uint8Array(1))[0] & 1 })}>
                <Pic name="coin" size={22} /> Flip a coin
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!S.over} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Game over</DialogTitle>
            <DialogDescription>{S.resigned != null ? `${S.players[S.resigned].name} resigned. ` : ''}{S.over} wins!</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onExit}>Back to home</Button>
            {!online && <Button onClick={() => adopt(freshGame(session), 0)}>Play again</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
