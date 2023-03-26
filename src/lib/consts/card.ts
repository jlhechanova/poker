import type { Rank, Suit } from './';

export default class Card {
  readonly rank: Rank;
  readonly suit: Suit;

  constructor(rank: Rank, suit: Suit) {
    this.rank = rank;
    this.suit = suit;
  }
}