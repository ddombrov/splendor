import { useState } from 'react';
import { Bot, BookOpen, Globe, Loader2, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Rules from '@/components/Rules.jsx';
import { api } from '../net/api.js';
import { Field, GemRow, Segmented } from './parts.jsx';

const MODES = [
  { key: 'device', icon: Users, title: 'Play on this device', blurb: 'Two people, one screen' },
  { key: 'ai', icon: Bot, title: 'Play the computer', blurb: 'Choose a difficulty and how far ahead it thinks' },
  { key: 'online', icon: Globe, title: 'Play online', blurb: 'Create a game or join with a code' },
  { key: 'quick', icon: Zap, title: 'Quick match', blurb: 'Be paired with another player' },
];

const EXPANSION = [{ value: 'base', label: 'Base game' }, { value: 'exp', label: 'Counterfeiters' }];
const SOURCES = [{ value: 'random', label: 'Random' }, { value: 'official', label: 'Official', disabled: true }];
const DIFFICULTIES = [{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }];
const DEPTHS = [{ value: 'quick', label: 'Quick' }, { value: 'standard', label: 'Standard' }, { value: 'deep', label: 'Deep' }];

/** The choices every new game has. */
function Setup({ opts, set }) {
  return (
    <>
      <Field label="Game"><Segmented value={opts.exp ? 'exp' : 'base'} onChange={(v) => set({ exp: v === 'exp' })} options={EXPANSION} /></Field>
      <Field label="Cards"><Segmented value={opts.source} onChange={(v) => set({ source: v })} options={SOURCES} /></Field>
    </>
  );
}

function CodeEntry({ onJoined }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const join = async () => {
    setBusy(true);
    setError('');
    try { onJoined(await api.joinRoom(code)); } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <input
        autoFocus
        value={code}
        onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 5)); setError(''); }}
        onKeyDown={(e) => e.key === 'Enter' && code.length === 5 && join()}
        inputMode="numeric"
        placeholder="00000"
        className="w-full rounded-lg border bg-background py-3 text-center text-4xl font-extrabold tracking-[0.4em] outline-none placeholder:text-muted-foreground/40 focus:border-primary"
      />
      {error && <p className="text-sm text-amber-400">{error}</p>}
      <DialogFooter>
        <Button onClick={join} disabled={code.length < 5 || busy}>{busy && <Loader2 className="animate-spin" />}Join game</Button>
      </DialogFooter>
    </div>
  );
}

function GameDialog({ mode, onClose, onStart, onJoined }) {
  const [opts, setOpts] = useState({ exp: false, source: 'random', difficulty: 'medium', depth: 'standard' });
  const [tab, setTab] = useState('create');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setOpts((o) => ({ ...o, ...patch }));
  const title = MODES.find((m) => m.key === mode).title;
  const go = async () => { setBusy(true); await onStart({ mode: mode === 'online' ? 'online' : mode, ...opts }); };
  const joining = mode === 'online' && tab === 'join';
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Set up the game</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {mode === 'online' && <Segmented value={tab} onChange={setTab} options={[{ value: 'create', label: 'Create a game' }, { value: 'join', label: 'Join with a code' }]} />}
          {joining ? <CodeEntry onJoined={onJoined} /> : (
            <>
              <Setup opts={opts} set={set} />
              {mode === 'ai' && (
                <>
                  <Field label="Difficulty"><Segmented value={opts.difficulty} onChange={(v) => set({ difficulty: v })} options={DIFFICULTIES} /></Field>
                  <Field label="Depth"><Segmented value={opts.depth} onChange={(v) => set({ depth: v })} options={DEPTHS} /></Field>
                </>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={go} disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === 'online' ? 'Create game' : 'Start game'}</Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Home({ onStart, onJoined, onQuick }) {
  const [open, setOpen] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const pick = (key) => (key === 'quick' ? onQuick() : setOpen(key));
  return (
    <div className="fixed inset-0 overflow-auto bg-background">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center gap-8 px-6 py-10">
        <div className="space-y-4 text-center">
          <GemRow size={44} />
          <h1 className="text-5xl font-extrabold tracking-tight">Splendor Duel</h1>
          <p className="text-muted-foreground">A two-player game of jewels, crowns and prestige.</p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          {MODES.map(({ key, icon: Icon, title, blurb }, i) => (
            <button
              key={key}
              type="button"
              onClick={() => pick(key)}
              className={`flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:bg-accent ${i === 0 ? 'sm:col-span-2' : ''}`}
            >
              <Icon className="size-7 shrink-0 text-primary" />
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="text-sm text-muted-foreground">{blurb}</span>
              </span>
            </button>
          ))}
        </div>
        <Button variant="ghost" onClick={() => setShowRules(true)}><BookOpen /> Rules</Button>
      </div>

      {open && <GameDialog mode={open} onClose={() => setOpen(null)} onStart={onStart} onJoined={onJoined} />}
      {showRules && <Rules exp onClose={() => setShowRules(false)} />}
    </div>
  );
}
