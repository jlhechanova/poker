import Card from '../consts/card';
import { rankVal, suits, type HandValue } from '../consts';

export const mod = (n: number, m: number) => ((n % m + m) % m);

export const handComparator = (a: HandValue, b: HandValue) => { // desc
  let d = b.value - a.value;
  if (d) return d;

  for (let i = 0; i < 5; i++) {
    d = rankVal[b.cards[i].rank] - rankVal[a.cards[i].rank];
    if (d) return d;
  }

  return 0;
}

export const handEvaluator = (cards: Card[]): HandValue => {
  cards.sort((a, b) => rankVal[b.rank] - rankVal[a.rank]); // desc

  // partition cards into arrays of same ranks
  let partition: Card[][] = [];
  let start = 0;
  let end = 0;
  let maxRankCount = 0;
  for (let i = 1; i < 7; i++) {
    if (cards[i].rank != cards[i-1].rank) {
      end = i - 1;
      let subset = cards.slice(start, end + 1);
      partition.push(subset);
      if (subset.length > maxRankCount) {
        maxRankCount = subset.length;
      }
      start = i;
    }
  }
  partition.push(cards.slice(start));

  // 5 different ranks mean can form straight or flush
  if (partition.length >= 5) {
    // find (straight) flush
    let flush: Card[] = [];
    let sf = false;
    suits.forEach(suit => {
      if (sf) return;

      let i = 0;
      let sum = 0;
      let diff = 0;
      let five: Card[] = [];
      while (i < 7) {
        let card = cards[i];
        i++;
        if (card.suit !== suit) {
          if (++diff > 2) return;
          continue;
        }

        sum += rankVal[card.rank];
        five.push(card);

        if (five.length === 5) { // flush
          let max = rankVal[five[0].rank];
          let min = rankVal[five[4].rank];
          let stsum = 5 * (min + max) / 2;

          if (!flush.length) flush = five.map(card => card);

          if (stsum === sum) {
            flush = five
            sf = true;
            return;
          }

          card = five.shift()!;
          sum -= rankVal[card.rank];

          // sum(5,4,3,2) = 14, find ace of same suit
          if (sum === 14 && partition[0].some(card => 
            card.rank === 'A' && card.suit === suit)) 
          {
            five.push(new Card('A', suit));
            flush = five;
            sf = true;
            return;
          }
        }
      }
    });

    if (flush.length) {
      return {
        value: sf ? 8 : 5,
        cards: flush
      }
    }

    // no flush, find straight
    let ranks = partition.reduce((acc, sub) => {
      acc.push(sub[0]);
      return acc;
    }, []);
    if (ranks[0].rank === 'A') ranks.push(ranks[0]); // add ace at other side kek
    let i = 4;
    while (i < ranks.length) {
      let max = rankVal[ranks[i - 4].rank];
      let min = rankVal[ranks[i].rank];
      if (max - 4 === min % 13) { // works for 5,4,3,2,A
        return {
          value: 4,
          cards: ranks.slice(i-4, i+1)
        }
      }
      i++;
    }

    // no straight
    if (partition.length === 7) { // all unique cards
      return {
        value: 0,
        cards: cards.slice(0,5)
      }
    }

    if (maxRankCount === 3) { // three of a kind
      let trips: Card[] = [];
      partition.forEach(sub => {
        if (sub.length === 3) {
          trips = sub.concat(trips);
        } else {
          trips.push(sub[0]);
        }
      })
      return {
        value: 3,
        cards: trips.slice(0,5)
      }
    }

    if (partition.length === 5) { // 2p
      let pair1: Card[] = [];
      let pair2: Card[] = [];
      let kicker: Card;
      partition.forEach(sub => {
        if (!pair1.length && sub.length === 2) pair1 = sub;
        else if (!pair2.length && sub.length === 2) pair2 = sub;
        else if (!kicker) kicker = sub[0];
      })
      return {
        value: 2,
        cards: pair1.concat(pair2).concat([kicker])
      }
    }
    
    // pair only
    let best: Card[] = [];
    partition.forEach(sub => {
      if (sub.length === 2) {
        best = sub.concat(best);
      } else {
        best.push(sub[0]);
      }
    })
    return {
      value: 1,
      cards: best.slice(0,5)
    }
  }

  // quads
  if (maxRankCount == 4) {
    let quads: Card[] = [];
    partition.forEach(sub => {
      if (sub.length === 4) {
        quads = quads.length ? sub.concat(quads) : sub;
      } else if (quads.length % 2 === 0) {
        quads.push(sub[0]);
      }
    });
    return {
      value: 7,
      cards: quads
    }
  }

  // full
  if (maxRankCount == 3) {
    let trips: Card[] = [];
    let pair: Card[] = [];
    partition.forEach(sub => {
      if (!trips.length && sub.length === 3) trips = sub;
      else if (!pair.length && sub.length >= 2) pair = sub.slice(0,2);
    })
    if (trips.length && pair.length) {
      return {
        value: 6, 
        cards: trips.concat(pair)
      }
    }
  }

  // 2p
  let pair1: Card[] = [];
  let pair2: Card[] = [];
  let kicker: Card;
  partition.forEach(sub => {
    if (!pair1.length && sub.length === 2) pair1 = sub;
    else if (!pair2.length && sub.length === 2) pair2 = sub;
    else if (!kicker) kicker = sub[0];
  })
  return {
    value: 2,
    cards: pair1.concat(pair2).concat([kicker])
  }
}

export const calculateHandOutcome = (board: Card[], hands: (Card[] | undefined)[]) => {
  const handValues = hands.reduce((acc, hand, i) => {
    if (hand) {
      acc.push([i, handEvaluator(board.concat(hand))]);
    }
    return acc;
  }, [] as (number | HandValue)[][])

  handValues.sort((a, b) => {
    let x = a[1] as HandValue;
    let y = b[1] as HandValue;
    return handComparator(x, y);
  });

  let result: Map<HandValue, number[]> = new Map();
  let start = 0;
  let end = 0;
  for (let i = 1, len = handValues.length; i < len; i++) {
    if (handComparator(handValues[i][1], handValues[i-1][1])) {
      end = i - 1;
      let values: number[] = [];
      for (let j = start; j < end + 1; j++) {
        values.push(<number> handValues[j][0]);
      }
      result.set(handValues[start][1], values);
      start = i;
    }
  }
  let values: number[] = [];
  for (let i = start, len = handValues.length; i < len; i++) {
    values.push(handValues[i][0]);
  }
  result.set(handValues[start][1], values);

  return result;
}
