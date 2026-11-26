import { useState } from 'react';
import { createPortal } from 'react-dom';
import CardMapping from './CardMapping.jsx';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cardsPref, countersPref, expPref, setLook, useLook, useMaaikeGame } from '../lib/look.js';
import { rememberName, rememberName2, savedName, savedName2 } from '../net/api.js';
import { NameField } from '../screens/parts.jsx';

/** One player's saved name: "Playing as X" with a Change link, or a text box while it is being changed. */
function NameRow({ label, value, onSave, taken }) {
  const [draft, setDraft] = useState(null);
  const clash = draft != null && taken && draft.trim().toLowerCase() === taken.toLowerCase();
  const save = () => {
    if (clash) return;
    if (draft.trim()) onSave(draft.trim());
    setDraft(null);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-semibold">{label}:</span>
        {draft == null ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {value ? <>Playing as <b className="text-foreground">{value}</b></> : 'No name yet'}
            <button type="button" className="underline hover:text-foreground" onClick={() => setDraft(value)}>Change</button>
          </span>
        ) : (
          <Button size="sm" variant="outline" className="ml-auto" disabled={clash} onClick={save}>Save</Button>
        )}
      </div>
      {draft != null && <NameField autoFocus value={draft} onChange={setDraft} onEnter={save} placeholder={label} />}
      {clash && <p className="text-sm text-amber-400">The two players need different names.</p>}
    </div>
  );
}

/** Player 1 is the name used in every mode; player 2 is only used for games on one device. */
function PlayerNames() {
  const [names, setNames] = useState(() => [savedName(), savedName2()]);
  return (
    <div className="space-y-3 border-b pb-4">
      <NameRow label="Player 1" value={names[0]} taken={names[1]} onSave={(n) => { rememberName(n); setNames([n, names[1]]); }} />
      <NameRow label="Player 2" value={names[1]} taken={names[0]} onSave={(n) => { rememberName2(n); setNames([names[0], n]); }} />
    </div>
  );
}

const PREF = { exp: expPref, randomCards: cardsPref };

/**
 * The game options, the same list on the home page and inside a game. Looks change at once. Options that
 * change the cards in play start a new game when changed inside a game, and cannot change in an online one.
 */
export default function GameSettings({ onClose, inGame = false, current, locked = false, onRestart, title = 'Game settings', children }) {
  const look = useLook();
  const maaikeGame = useMaaikeGame();
  const counters = countersPref.use();
  const stored = { exp: expPref.use(), randomCards: cardsPref.use() };
  const shown = inGame ? current : stored;
  const classic = look === 'classic';
  const [pending, setPending] = useState(null);
  const [maaikeMapping, setMaaikeMapping] = useState(false);

  const rows = [
    { key: 'exp', title: 'Counterfeiters expansion', game: true },
    { key: 'look', title: 'Original look' },
    ...(inGame && maaikeGame ? [{ key: 'maaike', title: 'Maaike version' }] : []),
    { key: 'counters', title: 'Card counters' },
  ];
  const value = (r) => (r.key === 'look' ? classic : r.key === 'maaike' ? look === 'maaike' : r.key === 'counters' ? counters : r.needsModern && noRandom ? false : !!shown[r.key]);
  const noRandom = classic || !!shown.exp; // every card of the expansion and the original look is printed
  const disabled = (r) => (r.game && inGame && locked) || (r.needsModern && noRandom);
  const note = (r) => (r.game && inGame && locked ? 'Fixed for an online game.' : r.needsModern && noRandom ? r.text : r.text);
  const change = (r, on) => {
    if (r.key === 'look') setLook(on ? 'classic' : 'modern');
    else if (r.key === 'maaike') setLook(on ? 'maaike' : 'modern');
    else if (r.key === 'counters') countersPref.set(on);
    else if (inGame) setPending({ key: r.key, on });
    else PREF[r.key].set(on);
  };
  const confirm = () => {
    PREF[pending.key].set(pending.on);
    const next = { exp: current.exp, randomCards: current.randomCards, [pending.key]: pending.on };
    if (next.exp || classic) next.randomCards = false;
    onRestart({ ...next, randomRoyals: next.randomCards });
  };

  // The Maaike version's mapping opens over the game: a new tab would not know a Maaike game is being played, since
  // the game may be inside another site's frame, whose storage a separate tab cannot see.
  if (maaikeMapping) return createPortal(<CardMapping right="maaike" onClose={() => setMaaikeMapping(false)} />, document.body);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{pending ? 'Start a new game?' : title}</DialogTitle>
        </DialogHeader>
        {pending ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>Keep playing</Button>
            <Button onClick={confirm}>New game</Button>
          </DialogFooter>
        ) : (
          <>
            <div className="space-y-4">
              {!inGame && <PlayerNames />}
              {rows.map((r) => (
                <label key={r.key} className={`flex items-center justify-between gap-4 ${disabled(r) ? 'opacity-50' : 'cursor-pointer'}`}>
                  <span>
                    <span className="flex items-center gap-1.5 font-semibold">{r.title}{(r.key === 'look' || r.key === 'maaike') && <button type="button" title="See card mapping" className="text-muted-foreground hover:text-foreground" onClick={(e) => { e.preventDefault(); if (r.key === 'maaike') setMaaikeMapping(true); else window.open('/?mapping=1', '_blank'); }}><Info className="size-4" /></button>}</span>
                    {note(r) && <span className="block text-sm text-muted-foreground">{note(r)}</span>}
                  </span>
                  <Switch checked={value(r)} disabled={disabled(r)} onCheckedChange={(on) => change(r, on)} />
                </label>
              ))}
            </div>
            <div className="flex flex-col items-center gap-2 [&_button]:w-52 [&_button]:justify-center">
              {children}
            </div>
            <DialogFooter><Button onClick={onClose}>Done</Button></DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
