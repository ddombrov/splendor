import { useEffect, useState } from 'react';

/** A coin that spins, lands on one player, says so, and then reports back so the game can start. */
export default function CoinFlip({ winner, names, onDone }) {
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const land = setTimeout(() => setLanded(true), 1750);
    const done = setTimeout(onDone, 2900);
    return () => { clearTimeout(land); clearTimeout(done); };
    // the timers must only be set once for this flip
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="space-y-3 text-center">
      <div className="coinbox">
        <div className="coin" style={{ '--end': winner === 0 ? '1800deg' : '1980deg' }}>
          <div className="coinface"><b>1</b><small>{names[0]}</small></div>
          <div className="coinface back"><b>2</b><small>{names[1]}</small></div>
        </div>
      </div>
      <p className="h-6 text-lg font-semibold">{landed ? `${names[winner]} goes first!` : ''}</p>
    </div>
  );
}
