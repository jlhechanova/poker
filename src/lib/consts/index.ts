import type Card from "./card";

export const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;
export type Rank = typeof ranks[number];

export const suits = ["S", "C", "H", "D"] as const;
export type Suit = typeof suits[number];

export const phases = ["prehand", "preflop", "flop", "turn", "river", "showdown", 'posthand'] as const;

export const rankVal: {[R in Rank]: number} = Object.fromEntries(ranks.reduce((acc, rank, i) => {
  acc.push([rank, i + 2]);
  return acc;
}, [] as (Rank | number)[][]));

export type HandValue = {
  value: number,
  cards: Card[]
}