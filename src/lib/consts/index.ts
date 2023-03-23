export const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"] as const;
export type Rank = typeof ranks[number];

export const suits = ["S", "C", "H", "D"] as const;
export type Suit = typeof suits[number];

export type Card = {
  rank: Rank,
  suit: Suit
}