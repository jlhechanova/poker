import { ranks, suits } from './';
import type Card from './card';

export default class Deck {
  #deck: Card[];

  constructor() {
    this.#deck = [];
    this.deck();
  }

  // must be called before any subsequent deals().
  deck() {
    this.#deck = suits
      .map(suit => ranks.map(rank => ({ rank: rank, suit: suit })))
      .reduce((prev, curr) => prev.concat(curr));
  }

  // mutates deck to guarantee unique draws.
  deal() {
    const idx = Math.floor(Math.random() * this.#deck.length);
    return this.#deck.splice(idx, 1)[0];
  }
}