import { useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cardsPref, countersPref, expPref, setLook, useLook } from '../lib/look.js';

const PREF = { exp: expPref, randomCards: cardsPref };

/**
 * The game options, the same list on the home page and inside a game. Looks change at once. Options that
 * change the cards in play start a new game when changed inside a game, and cannot change in an online one.
 */
export default function GameSettings({ onClose, inGame = false, current, locked = false, onRestart, title = 'Game settings', children }) {
  const look = useLook();
  const counters = countersPref.use();
  const stored = { exp: expPref.use(), randomCards: cardsPref.use() };
  const shown = inGame ? current : stored;
  const classic = look === 'classic';
  const [pending, setPending] = useState(null);

  const rows = [
    { key: 'exp', title: 'Counterfeiters expansion', game: true },
    { key: 'look', title: 'Original look' },
    { key: 'counters', title: 'Card counters' },
  ];
  const value = (r) => (r.key === 'look' ? classic : r.key === 'counters' ? counters : r.needsModern && noRandom ? false : !!shown[r.key]);
  const noRandom = classic || !!shown.exp; // every card of the expansion and the original look is printed
  const disabled = (r) => (r.game && inGame && locked) || (r.needsModern && noRandom);
  const note = (r) => (r.game && inGame && locked ? 'Fixed for an online game.' : r.needsModern && noRandom ? r.text : r.text);
  const change = (r, on) => {
    if (r.key === 'look') setLook(on ? 'classic' : 'modern');
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

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pending ? 'Start a new game?' : title}</DialogTitle>
          <DialogDescription className={pending ? undefined : 'sr-only'}>{pending ? 'This changes the cards in play, so the current game will be lost.' : 'Choose what the game uses'}</DialogDescription>
        </DialogHeader>
        {pending ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>Keep playing</Button>
            <Button onClick={confirm}>New game</Button>
          </DialogFooter>
        ) : (
          <>
            <div className="space-y-4">
              {rows.map((r) => (
                <label key={r.key} className={`flex items-center justify-between gap-4 ${disabled(r) ? 'opacity-50' : 'cursor-pointer'}`}>
                  <span>
                    <span className="flex items-center gap-1.5 font-semibold">{r.title}{r.key === 'look' && <button type="button" title="See card mapping" className="text-muted-foreground hover:text-foreground" onClick={(e) => { e.preventDefault(); window.open('/?mapping=1', '_blank'); }}><Info className="size-4" /></button>}</span>
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
