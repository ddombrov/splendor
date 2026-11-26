import { Component, useCallback, useState } from 'react';
import Game from './Game.jsx';
import Home from './screens/Home.jsx';
import { Lobby, QuickMatch } from './screens/Waiting.jsx';
import { api } from './net/api.js';
import { clearSave, loadSave } from './lib/saves.js';

const SAVED = 'sd:view';
const loadView = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(SAVED));
    if (v?.name === 'game' && (v.session?.mode === 'device' || v.session?.mode === 'ai')) {
      // A reload in the middle of a game here picks up the saved game rather than starting the one it began as.
      return loadSave(v.session.mode) ? { name: 'game', session: { ...v.session, resume: true } } : { name: 'home' };
    }
    return v && ['lobby', 'game'].includes(v.name) ? v : { name: 'home' };
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
  const resume = (mode, name, name2) => { const v = loadSave(mode); if (v) setView({ name: 'game', session: { mode, name, name2, exp: v.exp, source: v.source, difficulty: v.difficulty, randomCards: v.randomCards, randomRoyals: v.randomRoyals, resume: true, key: Date.now() } }); };
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
    return <QuickMatch onMatched={matched} onCancel={home} onPlayComputer={() => start({ mode: 'ai', exp: false, source: 'random', difficulty: 'medium' })} />;
  }
  if (view.name === 'game') {
    return (
      <GameErrorBoundary key={view.session.key ?? view.session.code} session={view.session} onExit={home}>
        <Game session={view.session} onExit={home} onRestart={(o) => setView({ name: 'game', session: { ...view.session, ...o, key: Date.now(), resume: false } })} />
      </GameErrorBoundary>
    );
  }
  return <Home onStart={start} onResume={resume} onJoined={joined} onQuick={() => setView({ name: 'quick' })} />;
}

// If the game screen ever fails, this shows a way back instead of leaving a blank page, and lets the player copy
// what went wrong together with the saved game, so the problem can be replayed.
class GameErrorBoundary extends Component {
  state = { error: null, copied: false, details: '' };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error(error); }
  async details() {
    const { session } = this.props;
    const local = session.mode === 'device' || session.mode === 'ai';
    const room = local ? null : await api.getRoom(session.code).catch(() => null);
    return JSON.stringify({
      error: String(this.state.error?.stack || this.state.error),
      at: new Date().toISOString(),
      screen: { width: window.innerWidth, height: window.innerHeight },
      session,
      saved: local ? loadSave(session.mode) : room,
    }, null, 1);
  }
  copy = async () => {
    const details = await this.details();
    try { await navigator.clipboard.writeText(details); this.setState({ copied: true, details: '' }); } catch { this.setState({ details }); }
  };
  discard = () => { clearSave(this.props.session.mode); this.props.onExit(); };
  render() {
    if (!this.state.error) return this.props.children;
    const { session } = this.props;
    const local = session.mode === 'device' || session.mode === 'ai';
    const btn = 'rounded-md px-4 py-2 font-semibold';
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {local ? 'The game hit an error. Copy the game details and send them over so the problem can be replayed and fixed.' : `The game hit an error. Copy the game details and send them over so the problem can be replayed and fixed. This online game can be joined again with the code ${session.code}.`}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className={`${btn} border border-white/30`} onClick={this.copy}>{this.state.copied ? 'Copied' : 'Copy game details'}</button>
          {local && <button type="button" className={`${btn} border border-white/30`} onClick={this.discard}>Delete this saved game</button>}
          <button type="button" className={`${btn} bg-primary text-primary-foreground`} onClick={this.props.onExit}>Back to home</button>
        </div>
        {this.state.details && <textarea readOnly value={this.state.details} className="h-40 w-full max-w-xl rounded-md border border-white/20 bg-black/40 p-2 text-left text-xs" onFocus={(e) => e.target.select()} />}
      </div>
    );
  }
}
