import { useState } from 'react';
import { Bot, BookOpen, Globe, KeyRound, Loader2, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import Rules from '@/components/Rules.jsx';
import { api } from '../net/api.js';
import { Field, GemRow, Segmented } from './parts.jsx';

const MODES = [
  { key: 'device', icon: Users, title: 'Play on this device', blurb: 'Two people, one screen' },
  { key: 'ai', icon: Bot, title: 'Play the computer', blurb: 'Choose a difficulty and how far ahead it thinks' },
  { key: 'online', icon: Globe, title: 'Create an online game', blurb: 'Get a 5-digit code to share' },
  { key: 'join', icon: KeyRound, title: 'Join with a code', blurb: "Enter a friend's code" },
  { key: 'quick', icon: Zap, title: 'Quick match', blurb: 'Be paired with another player' },
];

const SOURCES = [
  { value: 'random', label: 'Random' },
  { value: 'official', label: 'Official', disabled: true },
];
const DIFFICULTIES = [{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }];
const DEPTHS = [{ value: 'quick', label: 'Quick' }, { value: 'standard', label: 'Standard' }, { value: 'deep', label: 'Deep' }];
const DEPTH_NOTE = { quick: 'Looks 1 move ahead, thinks for up to 0.5 seconds.', standard: 'Looks 2 moves ahead, thinks for up to 1.5 seconds.', deep: 'Looks 3 moves ahead, thinks for up to 3 seconds.' };

function NewGameDialog({ mode, onClose, onStart }) {
  const [exp, setExp] = useState(false);
  const [source, setSource] = useState('random');
  const [difficulty, setDifficulty] = useState('medium');
  const [depth, setDepth] = useState('standard');
  const [busy, setBusy] = useState(false);
  const title = MODES.find((m) => m.key === mode).title;
  const go = async () => { setBusy(true); await onStart({ mode, exp, source, difficulty, depth }); };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Choose how this game is set up.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <Field label="Expansion">
            <label className="flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm">
              <span>The Counterfeiters</span>
              <Switch checked={exp} onCheckedChange={setExp} />
            </label>
          </Field>
          <Field label="Cards" hint={'The official card list is empty for now, so games use randomly generated cards.'}>
            <Segmented value={source} onChange={setSource} options={SOURCES} />
          </Field>
          {mode === 'ai' && (
            <>
              <Field label="Difficulty"><Segmented value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} /></Field>
              <Field label="Depth" hint={DEPTH_NOTE[depth]}><Segmented value={depth} onChange={setDepth} options={DEPTHS} /></Field>
              <p className="text-xs text-muted-foreground">For now the computer plays random legal moves, whatever you pick here.</p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={go} disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === 'online' ? 'Create game' : 'Start game'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JoinDialog({ onClose, onJoined }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const join = async () => {
    setBusy(true);
    setError('');
    try { onJoined(await api.joinRoom(code)); } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Join with a code</DialogTitle>
          <DialogDescription>Enter the 5-digit code your friend sees.</DialogDescription>
        </DialogHeader>
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={join} disabled={code.length < 5 || busy}>{busy && <Loader2 className="animate-spin" />}Join game</Button>
        </DialogFooter>
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

      {['device', 'ai', 'online'].includes(open) && <NewGameDialog mode={open} onClose={() => setOpen(null)} onStart={onStart} />}
      {open === 'join' && <JoinDialog onClose={() => setOpen(null)} onJoined={onJoined} />}
      {showRules && <Rules exp onClose={() => setShowRules(false)} />}
    </div>
  );
}
