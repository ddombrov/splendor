// PROTOTYPE v3: throwaway. Delete this folder and the gate in main.jsx when a direction wins.
//
// Question: what should the playing screen look like once it stops being a stack of panels?
// Three directions, same real game underneath, switchable at
//   /?prototype=table&variant=A|B|C   (bottom bar, or the arrow keys)
//
// Only shared derivation lives here. Every direction draws its own layout from scratch.
import { cur, opp, selectedCard, plan, validLine, endOptions, resCap } from '../engine/engine.js';

export function promptText(S) {
  const pd = S.pending;
  if (S.toast) return S.toast;
  if (pd) {
    switch (pd.type) {
      case 'pick': return `Take a token from the board.${pd.plus ? ' Either 2 of the matching colour, or any 1.' : ''}`;
      case 'multi': return `Choose up to ${pd.max} token${pd.max > 1 ? 's' : ''}${pd.rule === 'same' ? ' of one type' : ''}, then confirm.`;
      case 'steal': return `Click one of ${opp(S).name}'s tokens to steal it.`;
      case 'royal': return 'Choose a royal card.';
      case 'discard': return 'Over 10 tokens. Click your own tokens to discard down to 10.';
      case 'wild': return 'Choose the colour for your wild bonus.';
      case 'freeReserve': return 'Reserve a card or a deck for free, or skip.';
      case 'freeCf': return 'Take a counterfeiter card for free.';
      case 'endabil': return 'Use a counterfeiter ability, or finish the turn.';
      case 'peek': return 'Choose 1 of these 3 cards to reserve.';
      default: break;
    }
  }
  if (S.mode === 'priv') return 'Privilege: click any non-gold token to take it.';
  if (S.mode === 'priv2') return 'Counterfeiter bonus: click one more non-gold token.';
  if (S.goldSel != null) return 'Gold chosen. Now pick a card or a deck, then complete the reserve.';
  return 'Take tokens in a line, buy a card, or reserve one.';
}

/** Everything the three directions need to know about the current position. Layout-free. */
export function derive(S) {
  const p = cur(S), o = opp(S), pd = S.pending;
  const card = selectedCard(S);
  const idle = !S.main && !pd;
  const payPlan = card ? plan(S, p, card) : null;
  const goldChosen = S.goldSel != null;
  const reservableSel = !!S.selCard && (S.selCard.src === 'pyr' || S.selCard.src === 'deck') && p.res.length < resCap(p);

  const payList = payPlan
    ? [...Object.entries(payPlan.pay).filter(([k]) => k !== 'gold'), ['gold', payPlan.pay.gold], ['glass', payPlan.g]]
        .reduce((m, [k, n]) => (n > 0 ? m.set(k, (m.get(k) || 0) + n) : m), new Map())
    : new Map();

  const selIdx = pd?.type === 'multi' ? pd.sel : goldChosen ? [...S.sel, S.goldSel] : S.sel;
  const cellCls = (c, i) => {
    let s = selIdx.includes(i) ? 'sel' : '';
    if (pd?.type === 'pick') s += c === pd.color || (pd.plus && c !== 'gold' && pd.left === 2) ? ' hl' : ' dim';
    else if (pd?.type === 'multi') s += c === 'gold' ? ' dim' : '';
    else if (pd) s += ' dim';
    return s;
  };

  return {
    p, o, pd, card, idle, payPlan, payList, goldChosen, reservableSel, cellCls, selIdx,
    prompt: promptText(S),
    affordable: (c) => idle && !!plan(S, p, c),
    canBuy: idle && !!card && !!payPlan,
    canRes: idle && goldChosen && reservableSel,
    canTake: idle && validLine(S, S.sel),
    canPriv: idle && (p.priv > 0 || S.mode === 'priv2'),
    canRefill: idle && S.bag.length > 0,
    canSkip: ['freeReserve', 'freeCf'].includes(pd?.type) || (pd?.type === 'pick' && pd.plus),
    endOpts: pd?.type === 'endabil' ? endOptions(S) : [],
    discarding: pd?.type === 'discard',
    stealing: pd?.type === 'steal',
  };
}

/** Which of a player's token piles are clickable right now, and what the click does. */
export function pileAction(S, idx, dispatch) {
  const pd = S.pending;
  const mine = idx === S.cur;
  if (pd?.type === 'discard' && mine) return (k) => dispatch({ type: 'disc', c: k });
  if (pd?.type === 'steal' && !mine) return (k) => (k === 'gold' ? null : dispatch({ type: 'steal', c: k }));
  return null;
}
