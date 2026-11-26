import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { Check, Copy, Loader2, ListChecks, History, ChevronDown, TriangleAlert, CircleCheck, Circle, Swords, ScrollText, RefreshCw, Hand, Bookmark, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { api } from './net/api.js';
import { botActions } from './engine/bot.js';
import { perkText } from './engine/data.js';
import { createGame, reduce, cur, opp, plan, canPass, canReplenish, endOptions, validLine, selectedCard, resCap, roomLeft, kinds, limitCount, winReason } from './engine/engine.js';
import { JewelCard, CfCard, RoyalCard, CardBack } from './components/Cards.jsx';
import Player from './components/Player.jsx';
import Rules from './components/Rules.jsx';
import GameSettings from './components/GameSettings.jsx';
import GameLog from './components/GameLog.jsx';
import { classicCardFile, isInfiniteName, isMaaikeName, setMaaikeGame, useLook } from './lib/look.js';
import { TokenArt, Scroll, Mini, CompleteIcon, Pic } from './components/Art.jsx';
import { computeLayout } from './layout.js';
import { clearSave, loadSave, writeSave } from './lib/saves.js';
import { Flights, diffFlights, takeSnapshot } from './motion.jsx';
import CoinFlip from './components/CoinFlip.jsx';

// The engine is deterministic, so the screen supplies the seed for each new game.
const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

// A card just dealt slides off the top of its deck into the empty place, turning over on the way.
function Dealt({ fresh, level, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const deck = el?.closest('.rowline')?.querySelector('.card.back');
    if (!fresh || !el || !deck) return undefined;
    const me = el.getBoundingClientRect();
    const from = deck.getBoundingClientRect();
    const k = me.width / (el.offsetWidth || 1); // the stage is scaled, and the move is measured inside it
    const anim = el.animate(
      [
        { transform: `translate(${(from.left - me.left) / k}px, ${(from.top - me.top) / k}px) perspective(800px) rotateY(180deg)` },
        { transform: 'translate(0px, 0px) perspective(800px) rotateY(0deg)' },
      ],
      { duration: 850, delay: 350, easing: 'cubic-bezier(0.3, 0.1, 0.25, 1)', fill: 'backwards' },
    );
    return () => anim.cancel();
  }, [fresh]);
  if (!fresh) return children;
  return (
    <div ref={ref} className="dealt">
      {children}
      <div className="dealtback"><CardBack level={level} /></div>
    </div>
  );
}

// The enlarged card grows out of the card that was clicked, wherever it sits on the screen.
function Magnified({ id, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const src = [...document.querySelectorAll(`[data-card-id="${id}"]`)].find((x) => !el?.contains(x));
    if (!el || !src) return undefined;
    const a = src.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    if (!b.width) return undefined;
    const anim = el.animate(
      [
        { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`, opacity: 0.6 },
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
      ],
      { duration: 260, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
    );
    return () => anim.cancel();
  }, [id]);
  return <div ref={ref} style={{ transformOrigin: 'top left' }}>{children}</div>;
}

function statusText(S) {
  const p = cur(S), pd = S.pending;
  if (S.toast) return S.toast;
  if (pd) {
    switch (pd.type) {
      case 'pick': return pd.plus ? `${p.name}: take up to 2 ${pd.color} tokens, or any 1 other non-gold token, from the board (highlighted), or press Skip.` : `${p.name}: take 1 ${pd.color} token from the board (highlighted).`;
      case 'multi': return `${p.name}: click up to ${pd.max} non-gold token${pd.max > 1 ? 's' : ''}${pd.rule === 'same' ? ' of one colour' : ''} on the board, then press Confirm.`;
      case 'steal': return `${p.name}: click one of ${opp(S).name}'s glowing tokens to steal it. Any token except gold can be stolen.`;
      case 'royal': return `${p.name}: click a royal card to see what it does, then press Claim royal.`;
      case 'discard': return `${p.name}: you hold ${limitCount(p)} tokens but may keep only 10. Click your tokens to return ${limitCount(p) - 10} to the bag${S.undo ? ', or press Undo move to choose a different move' : ''}.`;
      case 'wild': return `${p.name}: click one of your glowing colours for your wild card to copy.`;
      case 'freeReserve': return `${p.name}: reserve a card for free by clicking a card or a deck, or press Skip. No gold token comes with it.`;
      case 'freeCf': return `${p.name}: click a counterfeiter card or its deck to take it for free, or press Skip.`;
      case 'endabil': return `${p.name}: use one of your counterfeiter powers below the cards, or press Done to end your turn.`;
      case 'peek': return `${p.name}: choose 1 of these 3 cards to reserve.`;
      default: break;
    }
  }
  if (S.mode === 'priv') return `${p.name}: click any non-gold token to take it with your privilege.`;
  if (S.mode === 'priv2') return `${p.name}: counterfeiter bonus, click one more non-gold token.`;
  if (S.sel.length === 2 && !validLine(S, S.sel)) return `${p.name}: pick the token between these two to take 3 in a line, or choose different tokens.`;
  if (S.goldSel != null) return `${p.name}: gold token chosen. Click a card or a deck to reserve, then press Reserve card.`;
  if (canPass(S)) return `${p.name}: there is nothing to take, reserve or buy, and the board cannot be replenished, so press Pass.`;
  if (S.undo && !S.main) return `${p.name}: you hold ${limitCount(p)} tokens. Tokens over 10 are returned at the end of your turn, so follow with a buy, or press Undo privilege to take the privilege back.`;
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
  // clientWidth/Height follow the visible area exactly, including while a browser's device mode is being dragged smaller
  const read = () => ({ vw: document.documentElement.clientWidth || window.innerWidth, vh: document.documentElement.clientHeight || window.innerHeight });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const onResize = () => setVp((old) => { const n = read(); return n.vw === old.vw && n.vh === old.vh ? old : n; });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
    ro?.observe(document.documentElement);
    // Phones report the new size a moment after the rotation event, so read again once it has settled.
    const onRotate = () => { onResize(); [100, 300, 700].forEach((ms) => setTimeout(onResize, ms)); };
    window.addEventListener('orientationchange', onRotate);
    const mq = window.matchMedia?.('(orientation: portrait)');
    mq?.addEventListener?.('change', onRotate);
    window.screen?.orientation?.addEventListener?.('change', onRotate);
    onResize();
    return () => {
      window.removeEventListener('orientationchange', onRotate);
      mq?.removeEventListener?.('change', onRotate);
      window.screen?.orientation?.removeEventListener?.('change', onRotate);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, []);
  return vp;
}

// A resumed game keeps its board but takes the name chosen when resuming.
const resumedGame = (session) => {
  const S = loadSave(session.mode)?.S;
  if (S && session.name) S.players[0].name = session.name;
  if (S && session.mode === 'device' && session.name2) S.players[1].name = session.name2;
  return S && markInfinite(S);
};

// If either player is named infinite-test, both have endless tokens, so a game can be played through to the end for testing.
const markInfinite = (S) => {
  const on = S.players.some((p) => isInfiniteName(p.name));
  S.players.forEach((p) => { p.infinite = on; });
  return S;
};

const freshGame = (session) => {
  const g = createGame(session.exp, newSeed(), null, { randomCards: session.randomCards, randomRoyals: session.randomRoyals });
  if (session.name) g.players[0].name = session.name;
  if (session.mode === 'ai') g.players[1].name = 'Computer';
  if (session.mode === 'device' && session.name2) g.players[1].name = session.name2;
  return markInfinite(g);
};

/** Loads an online game from the server, then hands it to the board. */
export default function Game({ session, onExit, onRestart }) {
  const online = session.mode === 'online';
  const [init, setInit] = useState(() => (online ? null : { S: (session.resume && resumedGame(session)) || freshGame(session), rev: 0 }));
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!online) return;
    api.getRoom(session.code).then((room) => (room?.S ? setInit({ S: room.S, rev: room.rev }) : setGone(room?.replaced ? 'replaced' : true)));
  }, [online, session.code, session.seat]);
  if (gone) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold">{gone === 'replaced' ? 'You joined this game from another device.' : 'This game no longer exists.'}</p>
        <Button onClick={onExit}>Back to home</Button>
      </div>
    );
  }
  if (!init) {
    return <div className="fixed inset-0 flex items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }
  return <Board session={session} onExit={onExit} onRestart={onRestart} init={init} onReplaced={() => setGone('replaced')} />;
}

function Board({ session, onExit, onRestart, init, onReplaced }) {
  const lookMode = useLook();
  const vp = useViewport();
  const { exp } = session;
  const online = session.mode === 'online';
  const vsAi = session.mode === 'ai';
  const seat = online ? session.seat : vsAi ? 0 : null; // whose screen this is; null means both players share it
  const [S, setS] = useState(init.S);
  const hasMaaike = S.players.some((p) => isMaaikeName(p.name));
  useEffect(() => {
    setMaaikeGame(hasMaaike);
    return () => setMaaikeGame(false);
  }, [hasMaaike]);
  const Sref = useRef(init.S);
  const revRef = useRef(init.rev);
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
      if (room.replaced) { onReplaced(); return; }
      if (room.rev > revRef.current) adopt(room.S, room.rev);
    };
    pull();
    const id = setInterval(() => { pull(); }, 2000);
    return () => clearInterval(id);
  }, [online, session.code, adopt]);

  // Games that are not online are kept in the browser so they can be resumed from the home page.
  useEffect(() => {
    if (online) return;
    if (S.over) clearSave(session.mode); else writeSave(session, S);
  }, [S, online, session]);

  // Against the computer: it plays seat 1 after a short pause. It first shows what it has picked
  // (tokens or a card highlighted), then confirms the move a moment later.
  const botWaiting = useRef(false);
  const botMemory = useRef({}); // what the computer decided for this game, such as the hard player's goal
  useEffect(() => {
    if (!vsAi || S.over || S.awaitingFirst || S.cur !== 1 || botWaiting.current) return undefined;
    const t = setTimeout(() => {
      const acts = botActions(Sref.current, { difficulty: session.difficulty, memory: botMemory.current });
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
  }, [S, vsAi, session.difficulty]);
  const newGame = () => { botMemory.current = {}; adopt(freshGame(session), 0); };

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
      const old = new Set([...before.pyr.flat(), ...before.crow].map((c) => c?.id));
      setDealt([...S.pyr.flat(), ...S.crow].filter((c) => c && !old.has(c.id)).map((c) => c.id));
    }
    prevS.current = S;
    snapshot.current = takeSnapshot();
  }, [S]);
  const hiding = flights.filter((f) => f.type === 'refill').map((f) => f.cell);
  const landed = useCallback((id) => setFlights((list) => list.filter((f) => f.id !== id)), []);

  const myTurn = seat == null || (S.awaitingFirst ? seat === 0 : S.cur === seat);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [ask, setAsk] = useState(null);
  const [lastAsk, setLastAsk] = useState(null);
  const [picked, setPicked] = useState(null);
  const [royalPick, setRoyalPick] = useState(null);
  useEffect(() => { setRoyalPick(null); }, [S.pending?.type, S.royals.length]);
  // Clicking a card also shows what its perk does in the hint; clicking anywhere else, or moving on, clears it.
  const [inspect, setInspect] = useState(null);
  useEffect(() => { setInspect(null); }, [S.log.length]);
  const look = (card, fn) => () => { setInspect(card); fn?.(); };
  // A turn starts with the optional actions (replenish, use privileges), which can be used as often as allowed and in
  // any order, and moves on to the main action when skipped. Touching a token or a card counts as skipping.
  const [skipped, setSkipped] = useState(false);
  useEffect(() => { setSkipped(false); }, [S.cur, S.over, S.awaitingFirst]);
  const p = cur(S), pd = S.pending;
  // Going over ten tokens is allowed; the extra tokens are returned at the end of the turn.
  const canTakeTokens = S.board.some((c) => c && c !== 'gold');
  const canReserveGold = S.board.includes('gold') && p.res.length < resCap(p);
  const canPay = [...S.pyr.flat(), ...p.res, ...(S.exp ? S.crow : [])].some((c) => c && plan(S, p, c));
  // A privilege only takes a gem or pearl token from the board.
  const canUsePriv = (p.priv > 0 || S.mode === 'priv2') && canTakeTokens;
  // Skipping the optional step is only allowed when the player has a main action left to do.
  const mainPossible = canTakeTokens || canReserveGold || canPay;
  const noOptional = !canReplenish(S) && !canUsePriv;
  const past = skipped || noOptional; // the optional step is over, by choice or because there is nothing to choose
  const canGoBack = skipped && !noOptional; // skipped the optional step but could still take it
  const locked = !past && !S.mode && !S.pending && !S.awaitingFirst;
  const guard = (fn) => (locked ? () => { setSkipped(true); fn(); } : fn);
  const pdispatch = (a) => { if (locked && a.type === 'card') setSkipped(true); dispatch(a); };
  // Layout numbers. The cards get the size their rows allow, the board takes what is left, and any
  // spare width goes to the players, the cards and the board in that order of need.
  const prompt = statusText(S);
  // A perk that steals also says whether the steal would happen right now.
  const me = S.players[seat ?? S.cur];
  const them = S.players[1 - (seat ?? S.cur)];
  const steals = inspect && (inspect.ability === 'steal' || inspect.ab === 'steal' || inspect.ab === 'xsteal');
  const stealNote = !steals ? '' : roomLeft(me) < 1 ? ' Your hand is full (10/10), so you would not get to steal unless paying frees room.' : !kinds(S).some((k) => them.tok[k] > 0) ? ' Your opponent has nothing to steal right now.' : ' Your opponent has tokens, so you would get to steal.';
  const perk = perkText(inspect) && perkText(inspect) + stealNote;
  // Tokens being taken and a card shown enlarged never appear together; a gold token chosen to reserve with is fine.
  const previewCard = S.sel.length || S.mode ? null : inspect;
  const [sbW, setSbW] = useState(0); // width of the page scrollbar, which takes room from the stacked layout
  const { mode, players, stripH, padX, k, w, h, sideW, cardsW, cardZoom, boardColW, cell } = computeLayout({ ...vp, vw: vp.vw - sbW, exp: S.exp });
  const strip = players === 'bottom';
  const place = (col) => (strip ? { gridRow: 1, gridColumn: col } : undefined);
  const tall = mode === 'tall';
  const scrollRef = useRef(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const next = el && tall ? el.offsetWidth - el.clientWidth : 0;
    if (next !== sbW) setSbW(next);
  });
  const stacked = tall && w < 760; // narrow screens put one player above the other, each across the full width
  const colW = 64;
  // The card rows are fitted to their box by measuring them: they shrink rather than get cut off, and grow to use the room.
  const cardsRef = useRef(null);
  const zKey = `${cardZoom}|${cardsW}|${S.exp}|${mode}|${Math.round(h)}|${Math.round(w)}|${S.royals.length}|${S.crow.length}`;
  const [zFix, setZFix] = useState({ key: zKey, s: 1 });
  const zs = zFix.key === zKey ? zFix.s : 1;
  useLayoutEffect(() => {
    const el = cardsRef.current;
    if (!el || mode === 'tall' || !el.lastElementChild) return;
    const box = el.getBoundingClientRect();
    const used = el.lastElementChild.getBoundingClientRect().bottom - box.top;
    if (!box.height || !used) return;
    const widest = Math.max(...[...el.querySelectorAll('.rowline')].map((r) => r.scrollWidth * (box.width / el.clientWidth)));
    const byWidth = widest ? (box.width / widest) : 1;
    const next = Math.min(zs * ((box.height - 2) / used), zs * byWidth * 0.995, 1.35 / Math.max(cardZoom, 0.01) * cardZoom);
    const clamped = Math.max(0.45, Math.min(next, 1.5));
    if (Math.abs(clamped - zs) / zs > 0.008) setZFix({ key: zKey, s: clamped });
  }, [zKey, zs, S.pyr, S.royals.length, S.crow.length, mode, vp.vw, vp.vh]);
  const card = selectedCard(S);
  const act = (a) => () => dispatch(a);

  const idle = !S.main && !pd && myTurn;
  const canBuy = idle && card && !!plan(S, p, card);
  const reservableSel = !!S.selCard && (S.selCard.src === 'pyr' || S.selCard.src === 'deck') && p.res.length < resCap(p);
  const goldChosen = S.goldSel != null;
  const canRes = idle && goldChosen && reservableSel;
  const takeable = idle && validLine(S, S.sel);
  // The action in progress comes from what the player has chosen, or from the button they pressed.
  const action = S.sel.length ? 'take' : S.goldSel != null ? 'reserve' : S.mode ? 'priv' : picked || (card ? 'buy' : null);
  // Cards that can be bought glow, except while the player is taking tokens or reserving.
  const buying = idle && (action == null || action === 'buy');
  const plans = (c) => buying && !!plan(S, p, c);

  // Both players sit in one column left of the board, equal in height. Hovering one lets it take over the whole column.
  const [hovered, setHovered] = useState(null);
  // While you must steal a token, the opponent's hand stays open so you can pick from it.
  const shownHand = pd?.type === 'steal' && myTurn ? 1 - S.cur : pd?.type === 'wild' && myTurn ? S.cur : hovered;
  const playersColumn = (
    <div className={cn('relative min-h-0', tall ? (stacked ? 'order-2 flex flex-col gap-3' : 'order-2 grid grid-cols-2 gap-3') : strip ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3')} style={strip ? { gridColumn: '1 / -1', gridRow: 2, height: stripH } : undefined} onMouseLeave={() => setHovered(null)}>
      {[0, 1].map((i) => (
        <div key={i} className="flex min-h-0 flex-1 flex-col" style={stacked ? { height: 150, flex: 'none' } : undefined} onMouseOver={(e) => setHovered(e.target.closest('[data-zone="res"]') ? null : i)}>
          <Player S={S} idx={i} dispatch={pdispatch} onInspect={setInspect} colW={colW} viewer={seat} buying={buying} summary horizontal={strip || stacked} compact={stacked} />
        </div>
      ))}
      {shownHand != null && (
        <div
          className="handboard absolute z-30 p-4"
          style={tall
            ? { left: -10, right: -10, bottom: -10, height: `calc(100% + ${Math.round(cell * 6.692) + 96}px)`, backgroundColor: '#17403a' }
            : strip
              ? { left: -10, bottom: -10, height: h, width: padX + boardColW + 22, backgroundColor: '#17403a' }
              : { left: -10, top: -10, height: 'calc(100% + 20px)', width: sideW + 12 + boardColW + 20, backgroundColor: '#17403a' }}
        >
          <div className="flex h-full flex-col" style={{ width: tall ? '100%' : strip ? padX + boardColW : sideW + 12 + boardColW - 12 }}>
            <Player S={S} idx={shownHand} dispatch={pdispatch} onInspect={setInspect} colW={Math.floor(((tall ? w - 20 : strip ? padX + boardColW + 12 : sideW + 12 + boardColW) - 36 - (kinds(S).length) * 12) / (kinds(S).length + 1))} viewer={seat} buying={buying} zoomed wide />
            {(pd?.type === 'steal' || pd?.type === 'wild') && myTurn && prompt && (
              <div className="hintbox mt-3 flex min-h-[90px] shrink-0 items-center px-8 py-5 font-bold leading-snug text-white" style={{ fontSize: cell * 0.155 }}>{prompt}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // The game over message can be closed to look over the finished game, and opened again from the top bar.
  const [overOpen, setOverOpen] = useState(true);
  useEffect(() => { setOverOpen(true); }, [S.over]);
  const winner = S.players.find((x) => x.name === S.over);
  const winText = S.resigned == null && winner ? winReason(winner) : null;
  useEffect(() => {
    if (S.over) confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 }, colors: ['#d9b15a', '#5b8bd6', '#4aa174', '#d8283a', '#ffffff'] });
  }, [S.over]);

  const openAsk = (a) => { setLastAsk(a); setAsk(a); };
  const restart = () => openAsk({ title: 'Start over?', msg: 'The current game will be lost.', yes: 'Start over', onYes: newGame });
  const leave = () => openAsk({ title: 'Leave this game?', msg: online ? 'You can come back with the game code while it still exists.' : 'The game is saved. You can resume it from the home page.', yes: 'Leave', onYes: onExit });
  const resign = () => openAsk({ title: 'Resign?', msg: 'The other player wins.', yes: 'Resign', onYes: () => dispatch({ type: 'resign', player: seat ?? S.cur }) });
  const copyCode = () => {
    try { navigator.clipboard.writeText(session.code); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const canComplete = { take: takeable, buy: canBuy, reserve: canRes, refill: idle && canReplenish(S), priv: false }[action];
  const complete = () => {
    const type = { take: 'take', buy: 'buy', reserve: 'reserve', refill: 'repl' }[action];
    setPicked(null);
    dispatch({ type });
  };
  const cancel = () => { setPicked(null); setSkipped(false); dispatch({ type: 'cancelAction' }); };
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
    pd?.type === 'royal' && myTurn && { label: 'Claim royal', disabled: royalPick == null, onClick: act({ type: 'royal', i: royalPick }), go: true },
    pd?.type === 'discard' && S.undo && myTurn && { label: 'Undo move', onClick: act({ type: 'undo' }) },
  ].filter(Boolean);
  // A take or a reservation that would leave the player over ten says on its button how many tokens must go back.
  const overAfter = (actions) => {
    const next = actions.reduce((s, a) => reduce(s, a), S);
    return next.pending?.type === 'discard' ? limitCount(cur(next)) - 10 : 0;
  };
  const over = (action === 'take' || action === 'reserve') && canComplete ? overAfter([{ type: action }]) : 0;
  const completeLabel = over ? `${action === 'take' ? 'Take' : 'Reserve'} and discard ${over}` : { take: 'Take tokens', buy: 'Buy card', reserve: 'Reserve card', refill: 'Replenish' }[action];
  // A chosen card that could also be reserved offers both: reserving takes a gold token from the board for it.
  const gold = S.board.indexOf('gold');
  const alsoReserve = action === 'buy' && idle && reservableSel && gold >= 0;
  const reserveActs = [{ type: 'tok', i: gold }, { type: 'reserve' }];
  const reserveOver = alsoReserve ? overAfter(reserveActs) : 0;
  const buttons = extras.length ? extras : action ? [
    ...(action !== 'priv' ? [{ label: completeLabel, disabled: !canComplete, onClick: complete, go: true }] : []),
    ...(alsoReserve ? [{ label: reserveOver ? `Reserve and discard ${reserveOver}` : 'Reserve card', onClick: () => { setPicked(null); reserveActs.forEach(dispatch); }, go: true }] : []),
    { label: 'Cancel', disabled: !idle, onClick: cancel },
  ] : canPass(S) ? [
    { label: 'Pass', disabled: !idle, onClick: act({ type: 'pass' }), go: true },
  ] : past ? [
    { label: 'Take', disabled: !(idle && canTakeTokens), onClick: () => choose('take') },
    { label: 'Reserve', disabled: !(idle && canReserveGold), onClick: () => choose('reserve') },
    { label: 'Buy', disabled: !(idle && canPay), onClick: () => choose('buy') },
    ...(canGoBack ? [{ label: 'Back', disabled: !idle, onClick: () => setSkipped(false) }] : []),
  ] : [
    { label: 'Replenish', disabled: !(idle && canReplenish(S)), onClick: () => choose('refill') },
    { label: 'Use privilege', disabled: !(idle && canUsePriv), onClick: () => choose('priv') },
    { label: 'Skip', disabled: !(idle && mainPossible), onClick: () => setSkipped(true) },
    ...(S.undo ? [{ label: 'Undo privilege', disabled: !idle, onClick: act({ type: 'undo' }) }] : []),
  ];
  const slots = ['', 'one', 'two', 'three', ''][buttons.length];

  return (
    <>
      <div ref={scrollRef} className={cn('fixed inset-0', tall ? 'overflow-y-auto overflow-x-hidden overscroll-contain' : 'overflow-hidden')}>
        <div>
          <div className="stage relative flex flex-col gap-2 p-2.5" onClick={(e) => { if (e.currentTarget.contains(e.target) && !e.target.closest('[data-card-id], [data-keep]')) setInspect(null); }} style={tall ? { width: w, minHeight: h, zoom: k, '--cell': `${cell}px` } : { width: w, height: h, transform: `scale(${k})`, transformOrigin: '0 0', '--cell': `${cell}px` }}>
            <div data-keep className={cn('z-30 flex items-center gap-1.5', tall ? 'justify-end' : 'absolute right-3 top-3')} > 
              {S.over && !overOpen && <Button variant="ghost" className="h-10 px-3 text-sm text-white hover:bg-white/10 hover:text-white" onClick={() => setOverOpen(true)}>Game over</Button>}
              <Button variant="ghost" className="h-10 gap-2 px-3 text-sm text-white hover:bg-white/10 hover:text-white" onClick={() => setShowSettings(true)}><Pic name="settings" size={22} /> Settings</Button>
            </div>
            <div className={cn('grid gap-3', !tall && 'min-h-0 flex-1')} style={{ gridTemplateColumns: tall ? 'minmax(0,1fr)' : strip ? `${padX}px ${boardColW}px ${cardsW}px ${padX}px` : `${sideW}px minmax(0,1fr) ${cardsW}px`, gridTemplateRows: strip ? `minmax(0,1fr) ${stripH}px` : undefined }}>
              {playersColumn}
              {/* Middle: the board, with the selected card underneath */}
              <div className={cn('flex min-h-0 flex-col items-center gap-3', tall && 'order-1')} style={place(2)}>
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
                  <div className={cn('boardbtns', slots)} style={{ fontSize: cell * 0.155 }}>
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
                  <div className={cn('hintbox flex min-h-[76px] shrink-0 items-center px-8 py-4 font-bold leading-snug', S.toast && !perk ? 'text-amber-300' : 'text-white')} style={{ width: cell * 5.9615, fontSize: cell * 0.155 }}>
                    {perk ?? prompt}
                  </div>
                )}
              </div>

              {/* Right: all the cards */}
              <div data-zone="pyr" className={cn('compact-cards flex min-h-0 flex-col gap-3 overflow-hidden', tall ? 'order-3' : '-mt-0.5')} ref={cardsRef} style={{ '--z': cardZoom * zs, ...place(3) }}>
                <div className="rowline">
                  {S.royals.map((r, i) => (
                    <RoyalCard key={r.id} card={r} glow={pd?.type === 'royal' && myTurn} selected={royalPick === i} onClick={look(r, () => pd?.type === 'royal' && myTurn && setRoyalPick(i))} />
                  ))}
                  {!S.royals.length && <span className="text-xs text-muted-foreground">All claimed</span>}
                </div>
                {S.exp && (
                  <div className="rowline">
                    {S.cdeck.length > 0 && <CardBack level="cf" label="CF" count={S.cdeck.length} onClick={guard(() => dispatch({ type: 'card', src: 'cdeck' }))} />}
                    {S.crow.map((c, i) => (
                      <Dealt key={c.id} fresh={dealt.includes(c.id)} level="cf">
                        <CfCard card={c} selected={S.selCard?.src === 'cf' && S.selCard.i === i}
                          afford={plans(c) || pd?.type === 'freeCf'} onClick={look(c, guard(() => dispatch({ type: 'card', src: 'cf', i })))} />
                      </Dealt>
                    ))}
                  </div>
                )}
                {[2, 1, 0].map((l) => (
                  <div className="rowline" key={l}>
                    {S.decks[l].length > 0 && <CardBack level={l + 1} label={`L${l + 1}`} count={S.decks[l].length} onClick={guard(() => dispatch({ type: 'card', src: 'deck', l }))} />}
                    {S.pyr[l].map((c, i) => (
                      <Dealt key={c.id} fresh={dealt.includes(c.id)} level={l + 1}>
                        <JewelCard card={c} selected={S.selCard?.src === 'pyr' && S.selCard.l === l && S.selCard.i === i}
                          afford={plans(c)} onClick={look(c, guard(() => dispatch({ type: 'card', src: 'pyr', l, i })))} />
                      </Dealt>
                    ))}
                  </div>
                ))}
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {createPortal(<Flights flights={flights} onLanded={landed} />, document.body)}
      {previewCard && createPortal(
        <div className="pointer-events-none fixed right-3 z-[70]" style={{ top: 64 }}>
          <Magnified key={previewCard.id} id={previewCard.id}>
          {(() => {
            const printed = lookMode === 'classic' ? classicCardFile(previewCard) : null;
            if (previewCard.kind === 'cf' && printed) {
              // printed sideways: turn the upright picture back a quarter
              const sc = Math.min(2.6, (vp.vh * 0.5) / 124, (vp.vw * 0.5) / 189);
              return (
                <div style={{ position: 'relative', width: 189 * sc, height: 124 * sc }}>
                  <img src={`/classic/${printed}`} alt="" draggable={false} style={{ position: 'absolute', width: 124 * sc, height: 189 * sc, left: ((189 - 124) / 2) * sc, top: ((124 - 189) / 2) * sc, transform: 'rotate(-90deg)', borderRadius: 10 * sc }} />
                </div>
              );
            }
            const sc = Math.min(2.6, (vp.vh * 0.5) / 189, (vp.vw * 0.5) / 124);
            const Big = previewCard.kind === 'cf' ? CfCard : previewCard.kind === 'royal' ? RoyalCard : JewelCard;
            return (
              <div style={{ width: 124 * sc, height: 189 * sc }}>
                <div style={{ width: 124, transform: `scale(${sc})`, transformOrigin: 'top left' }}><Big card={previewCard} /></div>
              </div>
            );
          })()}
          </Magnified>
        </div>,
        document.body,
      )}
      {showRules && <Rules exp={exp} onClose={() => setShowRules(false)} />}
      {showSettings && (
        <GameSettings
          title="Settings"
          inGame
          locked={online}
          current={{ exp: !!session.exp, randomCards: !!session.randomCards, randomRoyals: !!session.randomRoyals }}
          onRestart={(o) => { setShowSettings(false); onRestart(o); }}
          onClose={() => setShowSettings(false)}
        >
          {online && (
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Game code</span>
              <span className="font-bold tracking-[0.2em]">{session.code}</span>
              <button type="button" onClick={copyCode} className="text-muted-foreground hover:text-foreground" title="Copy the code">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            {[
              ['log', 'Log', () => setShowLog(true)],
              ['rules', 'Rules', () => setShowRules(true)],
              ...(online ? [] : [['start-over', 'Start over', restart]]),
              ['resign', 'Resign', resign],
              ['leave-game', 'Leave game', leave],
            ].map(([icon, label, run]) => (
              <Button key={label} variant="outline" className="gap-2" onClick={() => { setShowSettings(false); run(); }}><Pic name={icon} size={20} /> {label}</Button>
            ))}
          </div>
        </GameSettings>
      )}

      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Game log</DialogTitle></DialogHeader>
          <GameLog S={S} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!ask} onOpenChange={(o) => !o && setAsk(null)}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{shownAsk?.title}</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAsk(null)}>Cancel</Button>
            <Button onClick={() => { const f = ask.onYes; setAsk(null); f(); }}>{shownAsk?.yes}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={S.awaitingFirst && !S.over} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" showCloseButton={false} aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Who goes first?</DialogTitle>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">The player who goes second gets a scroll.</p>
          </DialogHeader>
          {online && seat !== 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Waiting for Player 1 to choose.</p>
          ) : coin ? (
            <CoinFlip winner={coin.winner} names={[S.players[0].name, S.players[1].name]} onDone={() => { const w = coin.winner; setCoin(null); dispatch({ type: 'chooseFirst', player: w }); }} />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <Button key={i} variant="outline" className="h-auto py-4" onClick={() => dispatch({ type: 'chooseFirst', player: i })}>
                    <span className="text-base font-semibold">{S.players[i].name} goes first</span>
                  </Button>
                ))}
              </div>
              <Button variant="secondary" className="w-full" onClick={() => setCoin({ winner: crypto.getRandomValues(new Uint8Array(1))[0] & 1 })}>
                <Pic name="coin-gold-1" size={22} /> Flip a coin
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!S.over && overOpen} onOpenChange={setOverOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Game over</DialogTitle>
            <DialogDescription>{S.resigned != null ? `${S.players[S.resigned].name} resigned. ` : ''}{S.over} wins{winText ? ` with ${winText}` : ''}!</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onExit}>Back to home</Button>
            {!online && <Button onClick={newGame}>Play again</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
