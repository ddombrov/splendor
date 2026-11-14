/*
 * Screen layout. The game is drawn on a "stage" whose size is measured in stage pixels and then
 * scaled to the window, so one set of numbers works from a phone to an ultrawide monitor.
 *
 * Wide windows try two arrangements on the same stage and keep the one that gives the biggest board
 * and cards, so no space is wasted and no card is ever cut off:
 *   side:   [players stacked] [board] [cards]
 *   bottom: [board] [cards]  with both players side by side in a strip under them
 * Tall windows (phones, portrait tablets) stack everything on a stage that is as tall as it needs to be
 * and the page scrolls.
 *
 * In both wide arrangements the board size and the card size are chosen together: each is as big as the
 * height allows, and the width is shared between them so neither is squeezed more than the other.
 */

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export const WIDE_FROM = 1.3; // window width divided by height; below this the stacked layout is used
const BASE_W = 1560; // the stage the wide layout was designed on
const BASE_H = 900;
const BOARD_W = 5.9615; // the board is this many squares wide...
const BOARD_H = 6.692; // ...and this many tall, including its button strip
const CARDS_W = 744; // a row of a deck and five cards is this wide at full size
const CARDS_PAD = 38; // room the cards column needs around those rows
const HINT_ROOM = 84; // height kept free under the board so a hint always fits
const CARD_ROW_H = 174;
const ROW_EXTRA = 10; // padding and borders each row of cards adds on top of the card height
const GAP = 12;
const STRIP_H = 150; // height of the players strip in the bottom arrangement
const SIDE_MIN = 210;

/** The size of the stage, and the scale that maps it to the window. */
function wideStage(vw, vh) {
  const designW = BASE_W - (BASE_W - 1200) * clamp((1600 - vw) / 600, 0, 1);
  const designH = (designW * BASE_H) / BASE_W;
  const k = clamp(Math.min(vw / designW, vh / designH), 0.4, 3);
  return { k, w: vw / k, h: vh / k, s: designW / BASE_W };
}

/**
 * Board square size and card zoom that use the width and height best. Each is capped by the height
 * (cmax, zmax); the width is shared so that board width and card width are as equal as the caps allow.
 */
export function fit(width, cmax, zmax) {
  const a = BOARD_W;
  const b = CARDS_W;
  const cCap = Math.min(cmax, 150);
  const zCap = Math.min(zmax, 1.2);
  let c = width / (2 * a);
  let z = width / (2 * b);
  if (c > cCap) { c = cCap; z = Math.min(zCap, (width - a * c) / b); }
  else if (z > zCap) { z = zCap; c = Math.min(cCap, (width - b * z) / a); }
  return { cell: Math.max(48, Math.floor(c)), cardZoom: Math.max(0.4, Math.floor(z * 100) / 100) };
}

function side({ k, w, h, s }, rows) {
  const sideW = Math.round(SIDE_MIN * s);
  const width = w - 20 - 2 * GAP - sideW - CARDS_PAD;
  const cmax = (h - 20 - HINT_ROOM - 12) / BOARD_H;
  const zmax = (h - 24 - (rows - 1) * GAP - rows * ROW_EXTRA) / (rows * CARD_ROW_H);
  const { cell, cardZoom } = fit(width, cmax, zmax);
  const cardsW = Math.round(CARDS_W * cardZoom + CARDS_PAD);
  const spare = Math.max(0, w - 20 - 2 * GAP - sideW - cardsW - Math.ceil(cell * BOARD_W));
  const extraSide = Math.min(Math.round(spare * 0.3), 110);
  const sw = sideW + extraSide;
  return { mode: 'wide', players: 'side', k, w, h, sideW: sw, cardsW, cardZoom, cell, boardColW: w - 20 - 2 * GAP - sw - cardsW, padX: 0, stripH: 0 };
}

function bottom({ k, w, h }, rows) {
  const width = w - 20 - 3 * GAP - CARDS_PAD;
  const main = h - 20 - STRIP_H - GAP;
  const cmax = (main - HINT_ROOM + 20) / BOARD_H;
  const zmax = (main - (rows - 1) * GAP - rows * ROW_EXTRA) / (rows * CARD_ROW_H);
  const { cell, cardZoom } = fit(width, cmax, zmax);
  const cardsW = Math.round(CARDS_W * cardZoom + CARDS_PAD);
  const boardColW = Math.ceil(cell * BOARD_W);
  const padX = Math.max(0, Math.floor((w - 20 - 3 * GAP - boardColW - cardsW) / 2));
  return { mode: 'wide', players: 'bottom', k, w, h, sideW: 0, cardsW, cardZoom, cell, boardColW, padX, stripH: STRIP_H };
}

function wide({ vw, vh, exp }) {
  const stage = wideStage(vw, vh);
  const rows = exp ? 5 : 4;
  const a = side(stage, rows);
  const b = bottom(stage, rows);
  // The side arrangement is the established look, so the strip has to clearly beat it.
  return b.cell * b.cardZoom > a.cell * a.cardZoom * 1.06 ? b : a;
}

function tall({ vw, vh }) {
  const w = clamp(vw, 520, 900);
  const k = vw / w;
  const inner = w - 20;
  const cell = Math.min(124, Math.floor(inner / BOARD_W));
  const cardZoom = clamp((inner - CARDS_PAD) / CARDS_W, 0.5, 1.1);
  return { mode: 'tall', players: 'side', k, w, h: vh / k, sideW: inner, cardsW: inner, cardZoom, cell, boardColW: inner, padX: 0, stripH: 0 };
}

export function computeLayout({ vw, vh, exp = false }) {
  return vw / vh >= WIDE_FROM ? wide({ vw, vh, exp }) : tall({ vw, vh });
}
