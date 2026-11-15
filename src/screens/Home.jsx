import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import Rules from '@/components/Rules.jsx';
import { api } from '../net/api.js';
import { Pic } from '@/components/Art.jsx';
import { Field, GemRow, Segmented } from './parts.jsx';
import { loadSave } from '../lib/saves.js';

const MODES = [
  { key: 'device', pic: 'friends', title: 'Play on this device' },
  { key: 'ai', pic: 'ai', title: 'Play the computer' },
  { key: 'online', pic: 'online', title: 'Play with friends' },
  { key: 'quick', pic: 'quick-play', title: 'Quick match' },
];

const DIFFICULTIES = [{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }];
const DEPTHS = [{ value: 'quick', label: 'Quick' }, { value: 'standard', label: 'Standard' }, { value: 'deep', label: 'Deep' }];

/** The choices every new game has. */
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

function GameDialog({ mode, exp, onClose, onStart, onJoined }) {
  const [opts, setOpts] = useState({ source: 'random', difficulty: 'medium', depth: 'standard' });
  const [tab, setTab] = useState('create');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setOpts((o) => ({ ...o, ...patch }));
  const title = MODES.find((m) => m.key === mode).title;
  const go = async () => { setBusy(true); await onStart({ mode, exp, ...opts }); };
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

export default function Home({ onStart, onJoined, onQuick, onResume }) {
  const saves = ['device', 'ai'].map((m) => ({ mode: m, save: loadSave(m) })).filter((x) => x.save);
  const [open, setOpen] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [exp, setExp] = useState(() => { try { return localStorage.getItem('sd-exp') === '1'; } catch { return false; } });
  const changeExp = (v) => { setExp(v); try { localStorage.setItem('sd-exp', v ? '1' : '0'); } catch { /* ignore */ } };
  // Playing on one device has nothing to choose, so it starts straight away.
  const pick = (key) => (key === 'quick' ? onQuick() : key === 'device' ? onStart({ mode: 'device', exp, source: 'random' }) : setOpen(key));
  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden overscroll-contain">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center gap-8 px-6 py-10 [@media(max-height:520px)]:max-w-4xl [@media(max-height:520px)]:gap-3 [@media(max-height:520px)]:py-3">
        <div className="space-y-4 text-center [@media(max-height:520px)]:space-y-1">
          <GemRow size={44} />
          <h1 className="text-5xl font-extrabold tracking-tight [@media(max-height:520px)]:text-3xl">Splendor Duel</h1>
                  </div>
        <div className="grid w-full gap-3 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-2 [@media(max-height:520px)]:grid-flow-row [@media(max-height:520px)]:grid-cols-4 [@media(max-height:520px)]:grid-rows-1 [@media(max-height:520px)]:gap-2">
          {MODES.map(({ key, pic, title }) => (
            <button
              key={key}
              type="button"
              onClick={() => pick(key)}
              className={`flex items-center gap-4 rounded-xl border bg-card p-4 text-left [@media(max-height:520px)]:flex-col [@media(max-height:520px)]:gap-1 [@media(max-height:520px)]:p-2 [@media(max-height:520px)]:text-center [@media(max-height:520px)]:text-sm transition hover:border-primary hover:bg-accent`}
            >
              <Pic name={pic} size={44} />
              <span className="font-semibold">{title}</span>
            </button>
          ))}
        </div>
        {saves.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {saves.map(({ mode, save }) => (
              <Button key={mode} variant="secondary" onClick={() => onResume(mode)}>
                Resume {mode === 'ai' ? 'game against the computer' : 'game on this device'}{save.exp ? ' (expansion)' : ''}
              </Button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setShowRules(true)}><Pic name="rules" size={22} /> Rules</Button>
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
            Counterfeiters expansion
            <Switch checked={exp} onCheckedChange={changeExp} />
          </label>
        </div>
      </div>

      {open && <GameDialog mode={open} exp={exp} onClose={() => setOpen(null)} onStart={onStart} onJoined={onJoined} />}
      {showRules && <Rules exp={exp} onClose={() => setShowRules(false)} />}
    </div>
  );
}
