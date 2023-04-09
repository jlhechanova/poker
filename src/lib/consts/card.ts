import type { Rank, Suit } from './';

export default class Card {
  readonly rank: Rank;
  readonly suit: Suit;
  best: boolean;

  constructor(rank: Rank, suit: Suit) {
    this.rank = rank;
    this.suit = suit;
    this.best = false;
  }
}