import { useEffect, useReducer, useState } from 'react';
import confetti from 'canvas-confetti';
import { ListChecks, FlaskConical, History, BookOpen, RotateCcw, Settings, ChevronDown, TriangleAlert, CircleCheck, Circle, Swords, ScrollText, RefreshCw, Hand, Bookmark, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { createGame, reduce, cur, opp, plan, endOptions, validLine, selectedCard, resCap } from './engine/engine.js';
import { JewelCard, CfCard, RoyalCard, CardBack } from './components/Cards.jsx';
import Player from './components/Player.jsx';
import Rules from './components/Rules.jsx';
import { TokenArt, Scroll, Gem, Mini } from './components/Art.jsx';

// The engine is deterministic, so the screen supplies the seed for each new game.
const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

const readExp = () => {
  const q = new URLSearchParams(window.location.search).get('exp');
  if (q !== null) return q === '1';
  try { return localStorage.getItem('sd-exp') === '1'; } catch { return false; }
};

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
  if (S.goldSel != null) return `${p.name}: gold token chosen. Choose a card or deck to reserve, then press Complete move.`;
  return null;
}

function TurnOptionsDialog({ open, onOpenChange }) {
  const Item = ({ icon: Icon, children }) => (
    <li className="flex items-start gap-2"><Icon className="mt-0.5 size-4 shrink-0 text-primary" />{children}</li>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Turn options</DialogTitle>
          <DialogDescription>What you can do on your turn.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Optional, before your action</div>
            <ul className="space-y-2">
              <Item icon={ScrollText}>Use a privilege to take any one non-gold token.</Item>
              <Item icon={RefreshCw}>Refill the board from the bag. Your opponent gets a privilege.</Item>
            </ul>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Then choose one</div>
            <ul className="space-y-2">
              <Item icon={Hand}>Take up to 3 tokens in a straight line.</Item>
              <Item icon={Bookmark}>Reserve a card and take a gold token.</Item>
              <Item icon={ShoppingCart}>Buy a card from the pyramid or your reserve.</Item>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
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

// The game is laid out on a stage that matches the window exactly. The scale is chosen so a
// 1560 by 900 design always fits, and any extra width or height is shared out by the layout.
const MIN_W = 1560;
const MIN_H = 900;
function useFitScale() {
  const read = () => {
    const k = Math.max(0.4, Math.min(window.innerWidth / MIN_W, window.innerHeight / MIN_H));
    return { k, w: window.innerWidth / k, h: window.innerHeight / k };
  };
  const [fit, setFit] = useState(read);
  useEffect(() => {
    const onResize = () => setFit(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return fit;
}

export default function App() {
  const { k, w, h } = useFitScale();
  const [exp, setExp] = useState(readExp);
  const [S, dispatch] = useReducer(reduce, null, () => createGame(exp, newSeed()));
  const [showRules, setShowRules] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [ask, setAsk] = useState(null);
  const [lastAsk, setLastAsk] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const p = cur(S), pd = S.pending;
  // Layout numbers. The cards get the size their rows allow, the board takes what is left, and any
  // spare width goes to the players, the cards and the board in that order of need.
  const prompt = statusText(S);
  const extra = Math.max(0, w - MIN_W);
  const playersW = Math.round(Math.min(250 + extra * 0.2, 360));
  const cardRows = S.exp ? 5 : 4;
  const zByHeight = (h - 20 - 24 - (cardRows - 1) * 8 - cardRows * 4) / (cardRows * 174);
  const cardsW = Math.round(Math.min(764 + extra * 0.5, 744 * Math.min(zByHeight, 1.2) + 70));
  const cardZoom = Math.max(0.5, Math.min(zByHeight, (cardsW - 64) / 744, 1.2));
  const boardColW = w - 20 - playersW - cardsW - 24;
  const cell = Math.max(64, Math.min(Math.floor((boardColW - 72) / 5), Math.floor((h - 373) / 5)));
  const card = selectedCard(S);
  const act = (a) => () => dispatch(a);

  useEffect(() => {
    if (S.over) confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 }, colors: ['#d9b15a', '#5b8bd6', '#4aa174', '#d8283a', '#ffffff'] });
  }, [S.over]);

  const openAsk = (a) => { setLastAsk(a); setAsk(a); };
  const applyExp = (v) => {
    setExp(v);
    try { localStorage.setItem('sd-exp', v ? '1' : '0'); } catch { /* ignore */ }
    dispatch({ type: 'new', exp: v, seed: newSeed() });
  };
  const toggleExp = () => {
    const v = !exp;
    if (S.log.length <= 1) applyExp(v);
    else openAsk({ title: v ? 'Enable the expansion?' : 'Disable the expansion?', msg: 'Switching expansion mode starts a new game. The current game will be lost.', yes: v ? 'Enable and restart' : 'Disable and restart', onYes: () => applyExp(v) });
  };
  const newGame = () => openAsk({ title: 'Start a new game?', msg: 'The current game will be lost.', yes: 'New game', onYes: () => dispatch({ type: 'new', exp, seed: newSeed() }) });

  const idle = !S.main && !pd;
  const plans = (c) => !S.main && !pd && !!plan(S, p, c);
  const canBuy = idle && card && !!plan(S, p, card);
  const reservableSel = !!S.selCard && (S.selCard.src === 'pyr' || S.selCard.src === 'deck') && p.res.length < resCap(p);
  const goldChosen = S.goldSel != null;
  const canRes = idle && goldChosen && reservableSel;
  const takeable = idle && validLine(S, S.sel);
  const payPlan = card ? plan(S, p, card) : null;
  const payList = payPlan ? [...Object.entries(payPlan.pay).filter(([k]) => k !== 'gold'), ['gold', payPlan.pay.gold], ['glass', payPlan.g]].reduce((m, [k, n]) => { if (n > 0) m.set(k, (m.get(k) || 0) + n); return m; }, new Map()) : new Map();
  const endOpts = pd?.type === 'endabil' ? endOptions(S) : [];
  const selIdx = pd?.type === 'multi' ? pd.sel : S.goldSel != null ? [...S.sel, S.goldSel] : S.sel;
  const shownAsk = ask || lastAsk;

  return (
    <>
      <div className="fixed inset-0 overflow-hidden bg-background">
        <div>
          <div className="stage relative flex flex-col gap-2 p-2.5" style={{ width: w, height: h, transform: `scale(${k})`, transformOrigin: '0 0', '--cell': `${cell}px` }}>
            <div className="absolute right-3 top-3 z-30 flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setShowLog(true)}><History /> Log</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm"><Settings /> Settings <ChevronDown className="opacity-60" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuItem onSelect={() => setShowOptions(true)} className="gap-2 py-2.5"><ListChecks /> Turn options</DropdownMenuItem>
                  <DropdownMenuItem onSelect={toggleExp} className="gap-2 py-2.5">
                    <FlaskConical />
                    <span>Counterfeiters expansion</span>
                    <Switch checked={exp} className="pointer-events-none ml-auto" tabIndex={-1} />
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setShowRules(true)} className="gap-2 py-2.5"><BookOpen /> Rules</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={newGame} className="gap-2 py-2.5"><RotateCcw /> New game</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {prompt && (
              <div className={cn('absolute left-1/2 top-3 z-30 max-w-[55%] -translate-x-1/2 truncate rounded-full border bg-card/95 px-4 py-1.5 text-xs shadow-lg backdrop-blur', S.toast ? 'border-amber-500/50 text-amber-300' : 'text-foreground')}>
                {prompt}
              </div>
            )}
            <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: `${playersW}px minmax(0,1fr) ${cardsW}px` }}>
              {/* Left: both players */}
              <div className="flex min-h-0 flex-col gap-3">
                <Player S={S} idx={0} dispatch={dispatch} />
                <Player S={S} idx={1} dispatch={dispatch} />
              </div>

              {/* Middle: the board, with the selected card underneath */}
              <div className="flex min-h-0 flex-col gap-3">
                <Card className="shrink-0 gap-3 p-3">
                  <div className="board-wrap mx-auto">
                    <div className="board">
                      {S.board.map((c, i) => {
                        let cls = selIdx.includes(i) ? 'sel' : '';
                        if (pd?.type === 'pick') cls += c === pd.color || (pd.plus && c !== 'gold' && pd.left === 2) ? ' hl' : ' dim';
                        else if (pd?.type === 'multi') cls += c === 'gold' ? ' dim' : '';
                        else if (pd) cls += ' dim';
                        return (
                          <div className="cell" key={i}>
                            {c && <Token kind={c} cls={cls} size={Math.round(cell * 0.85)} onClick={() => dispatch({ type: 'tok', i })} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        Scrolls on the table
                        {Array.from({ length: S.privBoard }, (_, i) => <Scroll key={i} size={15} />)}
                        {S.privBoard === 0 && 'none'}
                      </span>
                      <span>Bag: {S.bag.length}</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <Button size="sm" disabled={!takeable} onClick={act({ type: 'take' })}>Take {S.sel.length || ''} selected</Button>
                      <Button size="sm" variant="outline" disabled={!(idle && (p.priv > 0 || S.mode === 'priv2'))} onClick={act({ type: 'priv' })}>
                        {S.mode ? 'Cancel privilege' : `Use privilege (${p.priv})`}
                      </Button>
                      <Button size="sm" variant="outline" disabled={!(idle && S.bag.length)} onClick={act({ type: 'repl' })}>Refill board</Button>
                      {pd?.type === 'multi' && <Button size="sm" onClick={act({ type: 'confirmMulti' })}>Confirm {pd.sel.length} token{pd.sel.length === 1 ? '' : 's'}</Button>}
                      {(['freeReserve', 'freeCf'].includes(pd?.type) || (pd?.type === 'pick' && pd.plus)) && <Button size="sm" variant="outline" onClick={act({ type: 'skip' })}>Skip</Button>}
                    </div>
                  </div>
                </Card>

                <Card className={cn('min-h-0 flex-1 overflow-hidden p-3', !(card || goldChosen || reservableSel) && 'border-dashed bg-transparent')}>
                  {card || goldChosen || reservableSel ? (
                    <div className="flex min-h-0 gap-3">
                      {card && (
                        <div className="compact-cards pointer-events-none shrink-0" style={{ '--z': 0.7 }}>
                          {card.kind === 'cf' ? <CfCard card={card} /> : <JewelCard card={card} />}
                        </div>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-2 text-xs">
                        {card && (
                          <>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {payPlan ? (
                                <>
                                  <span className="text-muted-foreground">You pay</span>
                                  {payList.size === 0 && <span className="font-semibold">nothing</span>}
                                  {[...payList].map(([kind, n]) => (
                                    <span key={kind} className="costpill"><Mini kind={kind} size={14} /><b>{n}</b></span>
                                  ))}
                                </>
                              ) : (
                                <span className="text-muted-foreground">Not enough tokens for this card yet.</span>
                              )}
                            </div>
                            <div><Button size="sm" disabled={!canBuy} onClick={act({ type: 'buy' })}>Buy</Button></div>
                          </>
                        )}
                        {(goldChosen || reservableSel) && (
                          <div className="space-y-1.5 rounded-md border p-2">
                            <SectionLabel>Reserve a card</SectionLabel>
                            <ul className="space-y-1">
                              <li className="flex items-center gap-1.5">
                                {goldChosen ? <CircleCheck className="size-3.5 shrink-0 text-primary" /> : <Circle className="size-3.5 shrink-0 text-muted-foreground" />}
                                Gold token on the board
                              </li>
                              <li className="flex items-center gap-1.5">
                                {reservableSel ? <CircleCheck className="size-3.5 shrink-0 text-primary" /> : <Circle className="size-3.5 shrink-0 text-muted-foreground" />}
                                {S.selCard?.src === 'deck' ? `Level ${S.selCard.l + 1} deck (top card)` : 'Card from the pyramid or a deck'}
                              </li>
                            </ul>
                            <div className="flex flex-wrap gap-1.5">
                              <Button size="sm" disabled={!canRes} onClick={act({ type: 'reserve' })}>Complete move</Button>
                              <Button size="sm" variant="outline" onClick={act({ type: 'cancelReserve' })}>Cancel</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
                      Pick a card to see what it costs and to buy it. To reserve one, pick a gold token and a card.
                    </div>
                  )}
                </Card>
              </div>

              {/* Right: all the cards */}
              <Card className="compact-cards min-h-0 gap-2 overflow-hidden p-3" style={{ '--z': cardZoom }}>
                <div className="rowline">
                  {S.royals.map((r, i) => (
                    <RoyalCard key={r.id} card={r} glow={pd?.type === 'royal'} onClick={() => dispatch({ type: 'royal', i })} />
                  ))}
                  {!S.royals.length && <span className="text-xs text-muted-foreground">All claimed</span>}
                </div>
                {S.exp && (
                  <div className="rowline">
                    <CardBack level="cf" label="CF" count={S.cdeck.length} onClick={() => dispatch({ type: 'card', src: 'cdeck' })} />
                    {S.crow.map((c, i) => (
                      <CfCard key={c.id} card={c} selected={S.selCard?.src === 'cf' && S.selCard.i === i}
                        afford={plans(c) || pd?.type === 'freeCf'} onClick={() => dispatch({ type: 'card', src: 'cf', i })} />
                    ))}
                  </div>
                )}
                {[2, 1, 0].map((l) => (
                  <div className="rowline" key={l}>
                    <CardBack level={l + 1} label={`L${l + 1}`} count={S.decks[l].length} onClick={() => dispatch({ type: 'card', src: 'deck', l })} />
                    {S.pyr[l].map((c, i) => (
                      <JewelCard key={c.id} card={c} selected={S.selCard?.src === 'pyr' && S.selCard.l === l && S.selCard.i === i}
                        afford={plans(c)} onClick={() => dispatch({ type: 'card', src: 'pyr', l, i })} />
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

      {showRules && <Rules exp={exp} onClose={() => setShowRules(false)} />}
      <TurnOptionsDialog open={showOptions} onOpenChange={setShowOptions} />

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

      <Dialog open={!!S.over} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader><DialogTitle>Game over</DialogTitle><DialogDescription>{S.over} wins!</DialogDescription></DialogHeader>
          <DialogFooter><Button onClick={() => dispatch({ type: 'new', exp, seed: newSeed() })}>Play again</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
