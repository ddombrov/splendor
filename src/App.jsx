import { Component, useCallback, useState } from 'react';
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
      const { code } = await api.createRoom({ exp: opts.exp, source: opts.source, name: opts.name, randomCards: opts.randomCards, randomRoyals: opts.randomRoyals });
      setView({ name: 'lobby', code, exp: opts.exp });
    } else {
      setView({ name: 'game', session: { ...opts, key: Date.now() } });
    }
  };
  const resume = (mode, name) => { const v = loadSave(mode); if (v) setView({ name: 'game', session: { mode, name, exp: v.exp, source: v.source, difficulty: v.difficulty, depth: v.depth, randomCards: v.randomCards, randomRoyals: v.randomRoyals, resume: true, key: Date.now() } }); };
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
  if (view.name === 'game') {
    return (
      <GameErrorBoundary key={view.session.key ?? view.session.code} onExit={home}>
        <Game session={view.session} onExit={home} onRestart={(o) => setView({ name: 'game', session: { ...view.session, ...o, key: Date.now(), resume: false } })} />
      </GameErrorBoundary>
    );
  }
  return <Home onStart={start} onResume={resume} onJoined={joined} onQuick={() => setView({ name: 'quick' })} />;
}

// If the game screen ever fails, this shows a way back instead of leaving a blank page.
class GameErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">The game hit an error. Online games are saved and can be joined again with their code.</p>
        <button type="button" className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground" onClick={this.props.onExit}>Back to home</button>
      </div>
    );
  }
}
