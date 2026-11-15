import { useCallback, useState } from 'react';
import Game from './Game.jsx';
import Home from './screens/Home.jsx';
import { Lobby, QuickMatch } from './screens/Waiting.jsx';
import { api } from './net/api.js';
import { loadSave } from './lib/saves.js';

const SAVED = 'sd:view';
const loadView = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(SAVED));
    return v && ['lobby', 'game'].includes(v.name) && v.session?.mode !== 'device' && v.session?.mode !== 'ai' ? v : { name: 'home' };
  } catch { return { name: 'home' }; }
};

/** Which screen is showing: home, waiting for a friend, quick match, or a game. */
export default function App() {
  const [view, setViewRaw] = useState(loadView);
  const setView = useCallback((v) => {
    setViewRaw(v);
    try { sessionStorage.setItem(SAVED, JSON.stringify(v)); } catch { /* ignore */ }
  }, []);
  const home = useCallback(() => setView({ name: 'home' }), [setView]);

  const start = async (opts) => {
    if (opts.mode === 'online') {
      const { code } = await api.createRoom({ exp: opts.exp, source: opts.source, name: opts.name });
      setView({ name: 'lobby', code, exp: opts.exp });
    } else {
      setView({ name: 'game', session: { ...opts, key: Date.now() } });
    }
  };
  const resume = (mode) => { const v = loadSave(mode); if (v) setView({ name: 'game', session: { mode, exp: v.exp, source: v.source, difficulty: v.difficulty, depth: v.depth, resume: true, key: Date.now() } }); };
  const joined = ({ code, seat }) => api.getRoom(code).then((room) => setView({ name: 'game', session: { mode: 'online', code, seat, exp: room.exp } }));
  const matched = useCallback(({ code, seat }) => api.getRoom(code).then((room) => setView({ name: 'game', session: { mode: 'online', code, seat, exp: room.exp } })), [setView]);

  if (view.name === 'lobby') {
    return (
      <Lobby
        code={view.code}
        onCancel={async () => { await api.deleteRoom(view.code); home(); }}
        onOpponentJoined={() => setView({ name: 'game', session: { mode: 'online', code: view.code, seat: 0, exp: view.exp } })}
      />
    );
  }
  if (view.name === 'quick') {
    return <QuickMatch onMatched={matched} onCancel={home} onPlayComputer={() => start({ mode: 'ai', exp: false, source: 'random', difficulty: 'medium', depth: 'standard' })} />;
  }
  if (view.name === 'game') return <Game key={view.session.key ?? view.session.code} session={view.session} onExit={home} />;
  return <Home onStart={start} onResume={resume} onJoined={joined} onQuick={() => setView({ name: 'quick' })} />;
}
