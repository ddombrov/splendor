import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import Rules from '@/components/Rules.jsx';
import { api, rememberName, savedName } from '../net/api.js';
import { Pic } from '@/components/Art.jsx';
import { Field, GemRow, NameChoice, Segmented } from './parts.jsx';
import { loadSave } from '../lib/saves.js';
import GameSettings from '@/components/GameSettings.jsx';
import { cardsPref, expPref, useLook } from '../lib/look.js';

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
  const [name, setName] = useState(savedName);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [askName, setAskName] = useState(false);
  const [seats, setSeats] = useState(null); // the two names, when the game is full and this player has to say which one they are
  const join = async () => {
    setBusy(true);
    setError('');
    try { onJoined(await api.joinRoom(code, name.trim())); } catch (e) {
      if (e.reason === 'full' && e.names) setSeats(e.names);
      else { setError(e.message); if (e.reason === 'needname' || e.reason === 'taken') setAskName(true); }
      setBusy(false);
    }
  };
  const claim = async (seat) => {
    setBusy(true);
    try { onJoined(await api.claimSeat(code, seat)); } catch (e) { setError(e.message); setBusy(false); }
  };
  if (seats) {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">This game already has two players. Which one are you?</p>
        <div className="grid gap-2">
          {seats.map((n, i) => <Button key={i} size="lg" variant="outline" className="h-14 text-lg" disabled={busy} onClick={() => claim(i)}>{n}</Button>)}
        </div>
        {error && <p className="text-sm text-amber-400">{error}</p>}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {(name.trim() || askName) && <NameChoice autoFocus={askName} value={name} onChange={(v) => { setName(v); setError(''); }} onEnter={() => code.length === 5 && name.trim() && join()} />}
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

function GameDialog({ mode, exp, resumable, onClose, onStart, onJoined, onResume, onQuick }) {
  const [opts, setOpts] = useState({ source: 'random', difficulty: 'medium', depth: 'standard' });
  const [tab, setTab] = useState('create');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setOpts((o) => ({ ...o, ...patch }));
  // With an unfinished game saved, the same dialog asks whether to resume it.
  const title = resumable ? 'Resume your game?' : MODES.find((m) => m.key === mode).title;
  const [name, setName] = useState(savedName);
  const go = async () => { setBusy(true); rememberName(name.trim()); await onStart({ mode, exp, ...opts, name: name.trim() }); };
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
              <NameChoice autoFocus value={name} onChange={setName} onEnter={() => name.trim() && (mode === 'quick' ? onQuick() : go())} />
              {mode === 'ai' && (
                <>
                  <Field label="Difficulty"><Segmented value={opts.difficulty} onChange={(v) => set({ difficulty: v })} options={DIFFICULTIES} /></Field>
                  <Field label="Depth"><Segmented value={opts.depth} onChange={(v) => set({ depth: v })} options={DEPTHS} /></Field>
                </>
              )}
              <DialogFooter>
                {resumable ? (
                  <>
                    <Button variant="outline" onClick={go} disabled={busy}>New game</Button>
                    <Button onClick={() => { rememberName(name.trim()); onResume(mode, name.trim()); }}>Resume game</Button>
                  </>
                ) : mode === 'quick' ? (
                  <>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => { rememberName(name.trim()); onQuick(); }} disabled={!name.trim()}>Find an opponent</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={go} disabled={busy || (mode === 'online' && !name.trim())}>{busy && <Loader2 className="animate-spin" />}{mode === 'online' ? 'Create game' : 'Start game'}</Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Home({ onStart, onJoined, onQuick, onResume }) {
  const [open, setOpen] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const classic = useLook() === 'classic';
  const exp = expPref.use();
  // The printed look has no pictures for made-up cards or the extra royal, so those options are left out with it.
  const randomCards = false; // the random card option was removed
  const start = (o) => onStart({ ...o, randomCards, randomRoyals: randomCards });
  // Every mode opens its setup dialog first; on this device and against the computer it also offers to resume.
  const pick = (key) => setOpen(key);
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setShowSettings(true)}><Pic name="settings" size={22} /> Settings</Button>
        </div>
      </div>

      {open && <GameDialog mode={open} exp={exp} resumable={(open === 'device' || open === 'ai') && !!loadSave(open)} onClose={() => setOpen(null)} onStart={start} onJoined={onJoined} onResume={onResume} onQuick={onQuick} />}
      {showSettings && (
        <GameSettings onClose={() => setShowSettings(false)}>
          <Button variant="outline" className="gap-2" onClick={() => { setShowSettings(false); setShowRules(true); }}><Pic name="rules" size={20} /> Rules and summary</Button>
        </GameSettings>
      )}
      {showRules && <Rules exp={exp} onClose={() => setShowRules(false)} />}
    </div>
  );
}
