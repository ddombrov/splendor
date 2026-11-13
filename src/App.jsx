import { useEffect, useReducer, useState } from 'react';
import confetti from 'canvas-confetti';
import { FlaskConical, History, BookOpen, RotateCcw, Settings, ChevronDown, TriangleAlert, Swords, ScrollText, RefreshCw, Hand, Bookmark, ShoppingCart } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { createGame, reduce, cur, opp, plan, endOptions, validLine, selectedCard, resCap } from './engine.js';
import { JewelCard, CfCard, RoyalCard, CardBack } from './components/Cards.jsx';
import Player from './components/Player.jsx';
import Rules from './components/Rules.jsx';
import { TokenArt, Scroll, Gem, Crown, Mini } from './components/Art.jsx';

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
  return null;
}

const CrownMark = ({ n, title }) => (
  <div className="crownmark" title={title}>
    <Crown size={52} />
    <b>{n}</b>
  </div>
);

function TurnBar({ S, open, setOpen }) {
  const p = cur(S);
  const prompt = statusText(S);
  const Item = ({ icon: Icon, children }) => (
    <li className="flex items-start gap-2"><Icon className="mt-0.5 size-4 shrink-0 text-primary" />{children}</li>
  );
  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn('rounded-xl border bg-card', S.toast && 'border-amber-500/50')}>
      <div className="flex items-center gap-3 px-4 py-3">
        {S.toast ? <TriangleAlert className="size-5 text-amber-400" /> : <Swords className="size-5 text-primary" />}
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{p.name}'s turn</div>
          {prompt && <div className={cn('text-sm', S.toast ? 'text-amber-300' : 'text-muted-foreground')}>{prompt}</div>}
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Turn options <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="grid gap-4 border-t px-4 py-3 text-sm sm:grid-cols-2">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Optional, before your action</div>
            <ul className="space-y-1.5">
              <Item icon={ScrollText}>Use a privilege to take any one non-gold token.</Item>
              <Item icon={RefreshCw}>Refill the board from the bag. Your opponent gets a privilege.</Item>
            </ul>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Then choose one</div>
            <ul className="space-y-1.5">
              <Item icon={Hand}>Take up to 3 tokens in a straight line.</Item>
              <Item icon={Bookmark}>Reserve a card and take a gold token.</Item>
              <Item icon={ShoppingCart}>Buy a card from the pyramid or your reserve.</Item>
            </ul>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Token({ kind, cls, onClick }) {
  return (
    <div className={`tok ${cls || ''}`} onClick={onClick}>
      <TokenArt kind={kind} size={54} />
    </div>
  );
}

const SectionLabel = ({ children, className }) => (
  <div className={cn('text-[11px] font-semibold uppercase tracking-widest text-muted-foreground', className)}>{children}</div>
);
const ButtonRow = ({ children, className }) => (
  <div className={cn('flex flex-wrap justify-center gap-2', className)}>{children}</div>
);

export default function App() {
  const [exp, setExp] = useState(readExp);
  const [S, dispatch] = useReducer(reduce, exp, createGame);
  const [showRules, setShowRules] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [ask, setAsk] = useState(null);
  const [lastAsk, setLastAsk] = useState(null);
  const [helpOpen, setHelpOpen] = useState(() => {
    try { return localStorage.getItem('sd-help') !== '0'; } catch { return true; }
  });
  const setHelp = (v) => {
    setHelpOpen(v);
    try { localStorage.setItem('sd-help', v ? '1' : '0'); } catch { /* ignore */ }
  };
  const p = cur(S), pd = S.pending;
  const card = selectedCard(S);
  const act = (a) => () => dispatch(a);

  useEffect(() => {
    if (S.over) confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 }, colors: ['#d9b15a', '#5b8bd6', '#4aa174', '#d8283a', '#ffffff'] });
  }, [S.over]);

  const openAsk = (a) => { setLastAsk(a); setAsk(a); };
  const applyExp = (v) => {
    setExp(v);
    try { localStorage.setItem('sd-exp', v ? '1' : '0'); } catch { /* ignore */ }
    dispatch({ type: 'new', exp: v });
  };
  const toggleExp = () => {
    const v = !exp;
    if (S.log.length <= 1) applyExp(v);
    else openAsk({ title: v ? 'Enable the expansion?' : 'Disable the expansion?', msg: 'Switching expansion mode starts a new game. The current game will be lost.', yes: v ? 'Enable and restart' : 'Disable and restart', onYes: () => applyExp(v) });
  };
  const newGame = () => openAsk({ title: 'Start a new game?', msg: 'The current game will be lost.', yes: 'New game', onYes: () => dispatch({ type: 'new', exp }) });

  const idle = !S.main && !pd;
  const plans = (c) => !S.main && !pd && !!plan(S, p, c);
  const canBuy = idle && card && !!plan(S, p, card);
  const canRes = idle && S.selCard && (S.selCard.src === 'pyr' || S.selCard.src === 'deck') && p.res.length < resCap(p) && S.board.includes('gold');
  const takeable = idle && validLine(S, S.sel);
  const payPlan = card ? plan(S, p, card) : null;
  const payList = payPlan ? [...Object.entries(payPlan.pay).filter(([k]) => k !== 'gold'), ['gold', payPlan.pay.gold], ['glass', payPlan.g]].reduce((m, [k, n]) => { if (n > 0) m.set(k, (m.get(k) || 0) + n); return m; }, new Map()) : new Map();
  const endOpts = pd?.type === 'endabil' ? endOptions(S) : [];
  const selIdx = pd?.type === 'multi' ? pd.sel : S.sel;
  const shownAsk = ask || lastAsk;

  return (
    <>
      <header className="relative flex h-44 items-start justify-end gap-2 overflow-hidden border-b px-5 py-3">
        <img src="/images/banner.png" alt="" aria-hidden className="absolute inset-0 -z-20 h-full w-full scale-110 object-cover opacity-60 blur-xl" />
        <img src="/images/banner.png" alt="Splendor Duel" className="absolute inset-y-0 left-1/2 -z-10 h-full -translate-x-1/2" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background/70 via-transparent to-background/70" />
        <Button variant="secondary" className="bg-background/70 backdrop-blur" onClick={() => setShowLog(true)}><History /> Log</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="bg-background/70 backdrop-blur"><Settings /> Settings <ChevronDown className="opacity-60" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
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
      </header>

      <main className="mx-auto flex max-w-[1480px] flex-col gap-4 p-4">
        <TurnBar S={S} open={helpOpen} setOpen={setHelp} />

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(280px,1fr)_auto_minmax(280px,1fr)]">
          <Player S={S} idx={0} dispatch={dispatch} />
          <Card className="order-first gap-3 p-4 lg:order-none lg:min-w-[400px]">
            <SectionLabel>Board</SectionLabel>
            <div className="board-wrap">
              <div className="board">
                {S.board.map((c, i) => {
                  let cls = selIdx.includes(i) ? 'sel' : '';
                  if (pd?.type === 'pick') cls += c === pd.color || (pd.plus && c !== 'gold' && pd.left === 2) ? ' hl' : ' dim';
                  else if (pd?.type === 'multi') cls += c === 'gold' ? ' dim' : '';
                  else if (pd) cls += ' dim';
                  return (
                    <div className="cell" key={i}>
                      {c && <Token kind={c} cls={cls} onClick={() => dispatch({ type: 'tok', i })} />}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                Scrolls on the table
                {Array.from({ length: S.privBoard }, (_, i) => <Scroll key={i} size={18} />)}
                {S.privBoard === 0 && 'none'}
              </span>
              <span>Bag: {S.bag.length}</span>
            </div>
            <ButtonRow>
              <Button disabled={!takeable} onClick={act({ type: 'take' })}>Take {S.sel.length || ''} selected</Button>
              <Button variant="outline" disabled={!(idle && (p.priv > 0 || S.mode === 'priv2'))} onClick={act({ type: 'priv' })}>
                {S.mode ? 'Cancel privilege' : `Use privilege (${p.priv})`}
              </Button>
              <Button variant="outline" disabled={!(idle && S.bag.length)} onClick={act({ type: 'repl' })}>Refill board</Button>
              {pd?.type === 'multi' && <Button onClick={act({ type: 'confirmMulti' })}>Confirm {pd.sel.length} token{pd.sel.length === 1 ? '' : 's'}</Button>}
              {(['freeReserve', 'freeCf'].includes(pd?.type) || (pd?.type === 'pick' && pd.plus)) && <Button variant="outline" onClick={act({ type: 'skip' })}>Skip</Button>}
            </ButtonRow>
          </Card>
          <Player S={S} idx={1} dispatch={dispatch} />
        </div>

        <Card className="p-4">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col gap-3">
              <SectionLabel>Royal cards{S.exp ? ` · deck ${S.rdeck.length}` : ''}</SectionLabel>
              <div className="rowline">
                {S.royals.map((r, i) => (
                  <RoyalCard key={r.id} card={r} glow={pd?.type === 'royal'} onClick={() => dispatch({ type: 'royal', i })} />
                ))}
                {!S.royals.length && <span className="text-sm text-muted-foreground">All claimed</span>}
              </div>
              <div className="flex items-end justify-between px-1">
                <CrownMark n={3} title="Claim a royal card at 3 crowns" />
                <CrownMark n={6} title="Claim a royal card at 6 crowns" />
              </div>
              <Separator />
              <SectionLabel>Cards</SectionLabel>
              {[0, 1, 2].map((l) => (
                <div className="rowline" key={l}>
                  <CardBack level={l + 1} label={`L${l + 1}`} count={S.decks[l].length} onClick={() => dispatch({ type: 'card', src: 'deck', l })} />
                  {S.pyr[l].map((c, i) => (
                    <JewelCard key={c.id} card={c} selected={S.selCard?.src === 'pyr' && S.selCard.l === l && S.selCard.i === i}
                      afford={plans(c)} onClick={() => dispatch({ type: 'card', src: 'pyr', l, i })} />
                  ))}
                </div>
              ))}
              {S.exp && (
                <div className="rowline">
                  <CardBack level="cf" label="CF" count={S.cdeck.length} onClick={() => dispatch({ type: 'card', src: 'cdeck' })} />
                  {S.crow.map((c, i) => (
                    <CfCard key={c.id} card={c} selected={S.selCard?.src === 'cf' && S.selCard.i === i}
                      afford={plans(c) || pd?.type === 'freeCf'} onClick={() => dispatch({ type: 'card', src: 'cf', i })} />
                  ))}
                </div>
              )}
              {pd?.type === 'wild' && (
                <ButtonRow>
                  {pd.colors.map((c) => <Button key={c} variant="outline" onClick={act({ type: 'wild', c })}><Gem kind={c} size={18} /> {c}</Button>)}
                </ButtonRow>
              )}
              {pd?.type === 'endabil' && (
                <ButtonRow>
                  {endOpts.map((o) => <Button key={o.k} variant="outline" onClick={act({ type: 'endabil', k: o.k })}>{o.t}</Button>)}
                  <Button onClick={act({ type: 'endDone' })}>Done</Button>
                </ButtonRow>
              )}
              {pd?.type === 'peek' && (
                <div className="rowline">
                  {pd.cards.map((c, i) => <JewelCard key={c.id} card={c} afford onClick={() => dispatch({ type: 'peekPick', i })} />)}
                </div>
              )}
            </div>

            <aside className="flex flex-col items-center gap-4 xl:sticky xl:top-4">
              <SectionLabel className="self-start">Selected card</SectionLabel>
              {card ? (
                <>
                  <div className="preview py-2">
                    {card.kind === 'cf' ? <CfCard card={card} /> : <JewelCard card={card} />}
                  </div>
                  <div className="flex min-h-8 flex-wrap items-center justify-center gap-2 text-sm">
                    {payPlan ? (
                      <>
                        <span className="text-muted-foreground">You pay</span>
                        {payList.size === 0 && <span className="font-semibold">nothing</span>}
                        {[...payList].map(([k, n]) => (
                          <span key={k} className="costpill"><Mini kind={k} size={15} /><b>{n}</b></span>
                        ))}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not enough tokens for this card yet.</span>
                    )}
                  </div>
                  <ButtonRow>
                    <Button disabled={!canBuy} onClick={act({ type: 'buy' })}>Buy</Button>
                    <Button variant="outline" disabled={!canRes} onClick={act({ type: 'reserve' })}>Reserve (+ gold)</Button>
                  </ButtonRow>
                </>
              ) : (
                <>
                  <img src="/images/box-art-sm.jpg" alt="Splendor Duel box art" className="w-60 rounded-xl border shadow-lg" />
                  <p className="text-center text-sm text-muted-foreground">Select a card to see its cost, what you would pay, and to buy or reserve it.</p>
                  <ButtonRow>
                    <Button disabled>Buy</Button>
                    <Button variant="outline" disabled>Reserve (+ gold)</Button>
                  </ButtonRow>
                </>
              )}
              {S.selCard?.src === 'deck' && (
                <p className="text-center text-sm text-muted-foreground">Level {S.selCard.l + 1} deck selected. Reserve to take its top card.</p>
              )}
            </aside>
          </div>
        </Card>
      </main>

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

      <Dialog open={!!S.over} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader><DialogTitle>Game over</DialogTitle><DialogDescription>{S.over} wins!</DialogDescription></DialogHeader>
          <DialogFooter><Button onClick={() => dispatch({ type: 'new', exp })}>Play again</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
