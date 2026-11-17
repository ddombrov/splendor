import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cardsPref, countersPref, expPref, royalsPref, setLook, useLook } from '../lib/look.js';

const PREF = { exp: expPref, randomCards: cardsPref, randomRoyals: royalsPref };

/**
 * The game options, the same list on the home page and inside a game. Looks change at once. Options that
 * change the cards in play start a new game when changed inside a game, and cannot change in an online one.
 */
export default function GameSettings({ onClose, inGame = false, current, locked = false, onRestart, title = 'Game settings', children }) {
  const look = useLook();
  const counters = countersPref.use();
  const stored = { exp: expPref.use(), randomCards: cardsPref.use(), randomRoyals: royalsPref.use() };
  const shown = inGame ? current : stored;
  const classic = look === 'classic';
  const [pending, setPending] = useState(null);

  const rows = [
    { key: 'exp', title: 'Counterfeiters expansion', text: 'Adds glassware tokens, counterfeiter cards and more royals.', game: true },
    { key: 'randomCards', title: 'Random cards', text: 'Deal made-up cards instead of the 67 printed ones.', game: true, needsModern: true },
    { key: 'randomRoyals', title: 'Random royal cards', text: 'Draw the royals from a pool of each 2 point power-up plus one 3 point royal.', game: true, needsModern: true },
    { key: 'look', title: 'Original look', text: 'The printed card pictures, tokens and card backs. Made-up cards and the extra royal have no printed picture, so they are off while this is on.' },
    { key: 'counters', title: 'Card counters', text: 'Show how many cards are in each stack in a hand.' },
  ];
  const value = (r) => (r.key === 'look' ? classic : r.key === 'counters' ? counters : !!shown[r.key]);
  const disabled = (r) => (r.game && inGame && locked) || (r.needsModern && classic);
  const note = (r) => (r.game && inGame && locked ? 'Fixed for an online game.' : r.needsModern && classic ? 'Not available with the original look.' : r.text);
  const change = (r, on) => {
    if (r.key === 'look') setLook(on ? 'classic' : 'modern');
    else if (r.key === 'counters') countersPref.set(on);
    else if (inGame) setPending({ key: r.key, on });
    else PREF[r.key].set(on);
  };
  const confirm = () => {
    PREF[pending.key].set(pending.on);
    onRestart({ exp: current.exp, randomCards: current.randomCards, randomRoyals: current.randomRoyals, [pending.key]: pending.on });
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
                    <span className="block font-semibold">{r.title}</span>
                    <span className="block text-sm text-muted-foreground">{note(r)}</span>
                  </span>
                  <Switch checked={value(r)} disabled={disabled(r)} onCheckedChange={(on) => change(r, on)} />
                </label>
              ))}
            </div>
            {children}
            <DialogFooter><Button onClick={onClose}>Done</Button></DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
