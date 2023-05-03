const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const suits = ["s", "c", "h", "d"];

export default class Deck {
  deck;

  constructor() {
    this.deck = [];
    this.init();
  }

  // must be called before any subsequent draw().
  init() {
    let deck = suits
      .map(suit => ranks.map(rank => rank + suit))
      .reduce((prev, curr) => prev.concat(curr));

    // Fisher-Yates
    for (let i = deck.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      let temp = deck[i];
      deck[i] = deck[j];
      deck[j] = temp;
    }

    this.deck = deck;
  }

  draw(n = 1) {
    return this.deck.splice(0, n);
  }
}