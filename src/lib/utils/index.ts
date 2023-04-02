import type Card from '../consts/card';
import { rankVal, suits, type HandStrength } from '../consts';

export const mod = (n: number, m: number) => ((n % m + m) % m);

const cardstoVal = (acc: number[] = [], card: Card) => {
  acc.push(rankVal[card.rank]);
  return acc;
}

export const handComparator = (a: HandStrength, b: HandStrength) => { // desc
  let d = b.strength - a.strength;
  if (d) return d;

  for (let i = 0; i < 5; i++) {
    d = b.cards[i] - a.cards[i];
    if (d) return d;
  }

  return 0;
}

export const evaluateHand = (cards: Card[]): HandStrength => {
  cards.sort((a, b) => rankVal[b.rank] - rankVal[a.rank]); // desc

  // STRAIGHT FLUSH
  let flush: number[] = [];
  let sf = false;
  suits.forEach(suit => {
    if (sf) return;

    let i = 0;
    let sum = 0;
    let diff = 0;
    let five: Card[] = [];
    while (i < 7) {
      let card = cards[i++];
      if (card.suit !== suit) {
        diff++;
        if (diff > 2) return;
        continue;
      }

      sum += rankVal[card.rank];
      five.push(card);

      if (five.length === 5) { // flush
        let max = rankVal[five[0].rank];
        let min = rankVal[five[4].rank];
        let stsum = 5 * (min + max) / 2;

        flush = five.reduce(cardstoVal, [] as number[]);

        if (stsum === sum) {
          sf = true;
          return;
        }
        
        card = five.shift()!;
        sum -= rankVal[card.rank];

        // sum(5,4,3,2) -> 14
        if (sum === 14) {
          flush.shift();
          flush.push(1);
          sf = true;
          return;
        }
      }
    }
  });

  if (sf) {
    return {
      strength: 8, 
      cards: flush
    }
  }

  // QUADS
  let quad = cards[3]; // sorted implies median is quads card
  let qcount = 0;
  let quads: Card[] = [];
  cards.forEach(card => {
    if (card.rank === quad.rank) {
      qcount++;
      quads.push(card);
    }
  });

  if (qcount === 4) {
    let kicker = cards[0];
    if (quad.rank === kicker.rank) {
      kicker = cards[4];
    }
    quads.push(kicker);

    return {
      strength: 7, 
      cards: quads.reduce(cardstoVal, [] as number[])
    }
  }

  // partition cards into arrays of same values
  // - will be used for finding three of a kind and pairs
  let partition: Card[][] = [];
  let start = 0;
  let end = 0;
  for (let i = 1; i < 7; i++) {
    if (cards[i].rank != cards[i-1].rank) {
      end = i - 1;
      partition.push(cards.slice(start, end + 1));
      start = i;
    }
  }
  partition.push(cards.slice(start));

  // FULL HOUSE
  let trips: Card[] = [];
  let pair: Card[] = [];
  for (let i = 0, len = partition.length; i < len; i++) {
    if (!trips.length && partition[i].length === 3) trips = partition[i];
    else if (!pair.length && partition[i].length >= 2) pair = partition[i].slice(0, 2);
  }
  if (trips.length && pair.length) {
    return {
      strength: 6, 
      cards: trips.concat(pair).reduce(cardstoVal, [] as number[])
    }
  }

  // FLUSH - done while finding straight flush
  if (flush.length) {
    return {
      strength: 5, 
      cards: flush
    }
  }

  // STRAIGHT
  let uniqueRanks = Array.from(new Set(cards.reduce(cardstoVal, [] as number[])));
  if (uniqueRanks[0] === rankVal['A']) { // handles 5,4,3,2,A
    uniqueRanks.push(1);
  }

  if (uniqueRanks.length >= 5) {
    let i = 4;
    while (i < uniqueRanks.length) {
      if (uniqueRanks[i-4] - 4 === uniqueRanks[i]) {
        return {
          strength: 4, 
          cards: uniqueRanks.slice(i-4, i+1)
        }
      }
      i++;
    }
  }

  // THREE OF A KIND - use trips from full house
  if (trips.length) {
    let i = 0;
    while (trips.length !== 5) {
      if (cards[i].rank !== trips[0].rank) {
        trips.push(cards[i]);
      }
      i++;
    }
    return {
      strength: 3,
      cards: trips.reduce(cardstoVal, [] as number[])
    }
  }

  // TWO PAIR AND PAIR
  if (pair.length) {
    let five: Card[] = [];
    let pair1: Card[] = [];
    let pair2: Card[] = [];
    for (let i = 0, len = partition.length; i < len; i++) {
      if (!five.length && 
        (partition[i].length !== 2 || (pair1.length && pair2.length)))
      {
        five.push(partition[i][0]);
      }

      if (partition[i].length === 2) {
        if (!pair1.length) {
          pair1 = partition[i];
        } else if (!pair2.length) {
          pair2 = partition[i];
        }
      }
    }
    if (pair1.length && pair2.length && five.length) {
      return {
        strength: 2,
        cards: pair1.concat(pair2).concat(five).reduce(cardstoVal, [] as number[])
      }
    }

    // PAIR
    let i = 0;
    while (pair.length !== 5) {
      if (cards[i].rank !== pair[0].rank) {
        pair.push(cards[i]);
      }
      i++;
    }
    return {
      strength: 1,
      cards: pair.reduce(cardstoVal, [] as number[])
    }
  }

  // HIGH CARD
  return {
    strength: 0,
    cards: cards.slice(0, 5).reduce(cardstoVal, [] as number[])
  }
}