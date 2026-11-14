/*
 * Screen layout. The game is drawn on a "stage" whose size is measured in stage pixels and then
 * scaled to the window, so one set of numbers works from a phone to an ultrawide monitor.
 *
 * - wide windows put the players, the board and the cards in three columns on a stage that always fits
 *   the window, so nothing scrolls. Small windows use a denser stage so the text stays readable.
 * - tall windows (phones, portrait tablets) stack the board, the players and the cards on a stage
 *   that is as tall as it needs to be, and the page scrolls.
 */

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export const WIDE_FROM = 1.3; // window width divided by height; below this the stacked layout is used
const BASE_W = 1560; // the stage the wide layout was designed on
const BASE_H = 900;
const BOARD_UNITS_W = 5.9615; // the board is this many squares wide...
const BOARD_UNITS_H = 6.692; // ...and this many tall, including its button strip
const HINT_ROOM = 130; // height kept free under the board so the hint always fits

/** The size of the stage, and the scale that maps it to the window. */
function wideStage(vw, vh) {
  const designW = BASE_W - (BASE_W - 1200) * clamp((1600 - vw) / 600, 0, 1);
  const designH = (designW * BASE_H) / BASE_W;
  const k = clamp(Math.min(vw / designW, vh / designH), 0.4, 3);
  return { k, w: vw / k, h: vh / k, s: designW / BASE_W };
}

function wide({ vw, vh, exp }) {
  const { k, w, h, s } = wideStage(vw, vh);
  const extra = Math.max(0, w - BASE_W * s);
  const cardRows = exp ? 5 : 4;
  const zByHeight = (h - 20 - 24 - (cardRows - 1) * 8 - cardRows * 4) / (cardRows * 174);
  const sideW = Math.round(210 * s + Math.min(extra * 0.08, 60));
  const cardsW = Math.round(Math.min(764 * s + extra * 0.5, 744 * Math.min(zByHeight, 1.2) + 70));
  const cardZoom = Math.max(0.45, Math.min(zByHeight, (cardsW - 64) / 744, 1.2));
  const boardColW = w - 20 - 2 * 12 - sideW - cardsW;
  const cell = Math.max(48, Math.min(Math.floor(boardColW / BOARD_UNITS_W), Math.floor((h - 32 - HINT_ROOM) / BOARD_UNITS_H)));
  return { mode: 'wide', k, w, h, sideW, cardsW, cardZoom, cell, boardColW };
}

function tall({ vw, vh, exp }) {
  const w = clamp(vw, 520, 900);
  const k = vw / w;
  const inner = w - 20;
  const cell = Math.min(124, Math.floor(inner / BOARD_UNITS_W));
  const cardZoom = clamp((inner - 14) / 744, 0.5, 1.1);
  void exp;
  return { mode: 'tall', k, w, h: vh / k, sideW: inner, cardsW: inner, cardZoom, cell, boardColW: inner };
}

export function computeLayout({ vw, vh, exp = false }) {
  return vw / vh >= WIDE_FROM ? wide({ vw, vh, exp }) : tall({ vw, vh, exp });
}
