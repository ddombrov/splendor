import { useEffect, useRef, useState } from 'react';
import { Bot, Check, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, onRemoteChange } from '../net/api.js';
import { CodeBoxes, GemRow } from './parts.jsx';

const Shell = ({ children }) => (
  <div className="fixed inset-0 flex items-center justify-center overflow-auto bg-background p-6">
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">{children}</div>
  </div>
);

/** The host waits here until someone joins with the code. */
export function Lobby({ code, onCancel, onOpponentJoined }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let live = true;
    const check = async () => {
      const room = await api.getRoom(code, 0);
      if (live && room?.seats[1]) onOpponentJoined();
    };
    check();
    const id = setInterval(check, 1500);
    const off = onRemoteChange(check);
    return () => { live = false; clearInterval(id); off(); };
  }, [code, onOpponentJoined]);
  const copy = () => {
    try { navigator.clipboard.writeText(code); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Shell>
      <GemRow size={34} />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Your game is ready</h1>
        <p className="text-sm text-muted-foreground">Send this code to your friend. They choose Join with a code.</p>
      </div>
      <CodeBoxes code={code} big />
      <Button variant="outline" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy code'}</Button>
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Waiting for your opponent to join</p>
      <Button variant="ghost" onClick={onCancel}>Cancel game</Button>
    </Shell>
  );
}

/** Quick match: wait in line to be paired. After a minute, offer the computer instead. */
export function QuickMatch({ onMatched, onCancel, onPlayComputer }) {
  const [seconds, setSeconds] = useState(0);
  const ticket = useRef(null);
  const done = useRef(false);
  useEffect(() => {
    let live = true;
    const poll = async () => {
      if (!ticket.current || done.current) return;
      const res = await api.quickStatus(ticket.current);
      if (live && res && !done.current) { done.current = true; onMatched(res); }
    };
    api.quickJoin().then((id) => {
      if (!live) { api.quickLeave(id); return; }
      ticket.current = id;
      poll();
    });
    const id = setInterval(() => { setSeconds((s) => s + 1); poll(); }, 1000);
    const off = onRemoteChange(poll);
    return () => { live = false; clearInterval(id); off(); if (ticket.current && !done.current) api.quickLeave(ticket.current); };
  }, [onMatched]);
  const slow = seconds >= 60;
  return (
    <Shell>
      <GemRow size={34} />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{slow ? 'No one has joined yet' : 'Looking for an opponent'}</h1>
        <p className="text-sm text-muted-foreground">
          {slow ? 'You can keep waiting, or play the computer now.' : 'Quick match is always the base game, with the same cards for both players.'}
        </p>
      </div>
      <div className="flex items-center gap-3 text-3xl font-extrabold tabular-nums">
        <Loader2 className="size-7 animate-spin text-primary" />
        {String(Math.floor(seconds / 60)).padStart(1, '0')}:{String(seconds % 60).padStart(2, '0')}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {slow && <Button onClick={onPlayComputer}><Bot /> Play the computer</Button>}
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </Shell>
  );
}
