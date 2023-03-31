import type Card from './card';
import Player from "./player";
import { phases, type HandStrength } from './';
import { mod, handComparator, evaluateHand } from '../utils';

export default class PokerTable {
  players: ( Player | undefined )[];
  isOngoing: boolean;
  bigBlind: Player | null;
  blinds: number;
  board: Card[];
  phase: typeof phases[number];
  phaseid: number;
  pot: number;
  toMatch: number;
  minRaise: number;

  constructor(blinds: number = 2, players: number = 4) {
    this.players = Array.from({length: players});
    this.isOngoing = false;
    this.bigBlind = null;
    this.blinds = blinds;
    this.board = [];
    this.phase = 'init';
    this.phaseid = 0;
    this.pot = 0;
    this.toMatch = 0;
    this.minRaise = 1;
  }

  clear() {
    this.board = [];
    this.phase = 'init';
    this.phaseid = 0;
    this.pot = 0;
    this.toMatch = 0;
    this.minRaise = 1;
  }

  nextPhase() {
    this.phaseid = (this.phaseid + 1) % phases.length;
    this.phase = phases[this.phaseid];
  }

  nextBB() {
    if (!this.getinSeat().length) {
      this.bigBlind = null;
    } else {
      let i = mod(this.bigBlind.seat - 1, this.players.length);
      while (!this.players[i] || !this.players[i].stack) {
        i = mod(i - 1, this.players.length);
      }
      this.bigBlind = this.players[i] as Player;
    }
  }

  kick(player: Player) {
    this.players[player.seat] = undefined;
    if (player === this.bigBlind) this.nextBB();
  }

  playerLeave(id: string | number) {
    let player = typeof id === 'number' ? this.players[id] :
      this.players.find(player => player && player.sid === id);

    if (player) {
      player.isinSeat = false;
      if (!player.isinHand) this.kick(player);
    }
  }
  
  playerDC(name: string) {
    const player = this.players.find(player => player?.sid === name) as Player;
    if (player) {
      player.isinSeat = false;
      if (!player.isinHand) this.kick(player);
    }
  }

  playerJoin(name: string, seat: number) {
    let player = this.players.find(player => player && player.sid === name);
    if (player) {
      if (this.phaseid !== 0) return;

      console.log(`Player ${name} switched from seat ${player.seat} to seat ${seat}`);
      this.players[player.seat] = undefined;
      player.seat = seat;
    } else {
      console.log(`Player ${name} has joined the table`);
      player = new Player(name, seat);
    }

    this.players[seat] = player;
    if (!this.bigBlind) {
      this.bigBlind = player;
    }
  }

  getinSeat() {
    return this.players.filter(player => 
      player?.isinSeat && player.stack > 0) as Player[];
  }

  getinHand() {
    return this.players.filter(player => 
      player?.isinHand) as Player[];
  }

  getinPlay() {
    return this.players.filter(player => 
      player?.isinHand && player.stack > 0) as Player[];
  }

  resolveBets() {
    // players still in the hand that have made an action
    const inRound = this.players.filter(player => 
      player?.isinHand && (!player.toAct || player.bets)) as Player[];
    
    const inHand = this.getinHand();

    // if only one player left in the hand, resolved
    if (inHand.length === 1) return true;

    // assume that a fold or bet(amt) where amt >= 0 is an action,
    //
    // |inRound| = |inHand| iff all players in the hand have acted. 
    // if all players have acted, then they either folded (|inHand| -= 1) 
    // or bet an amount >= 0 (|inRound| += 1), so |inRound| = |inHand|
    if (inRound.length !== inHand.length) return false;

    // betting is resolved if every non-allin bet = highest bet.
    const resolved = inRound.filter(player => player.stack > 0)
      .every(player => player.bets === this.toMatch);

    // in the case of bb and calls from other players during preflop,
    // bb will be counted to be in round due to initial blinds.
    // if betting is resolved but bb is yet to act, not resolved.
    if (this.phase === 'preflop' && resolved && this.bigBlind.toAct) return false;

    return resolved;
  }

  evaluate(hands: (Card[] | undefined)[]) {
    const handStrengths = hands.reduce((acc, hand, i) => {
      if (hand) {
        acc.push([i, evaluateHand(this.board.concat(hand))]);
      }
      return acc;
    }, [] as (number | HandStrength)[][])

    handStrengths.sort((a, b) => {
      let x = <HandStrength> a[1];
      let y = <HandStrength> b[1];
      return handComparator(x, y);
    });
    
    let result: number[][] = [];
    let start = 0;
    let end = 0;
    for (let i = 1, len = handStrengths.length; i < len; i++) {
      if (handComparator(<HandStrength> handStrengths[i][1], <HandStrength> handStrengths[i-1][1])) {
        end = i - 1;
        let values: number[] = [];
        for (let j = start; j < end + 1; j++) {
          values.push(<number> handStrengths[j][0]);
        }
        result.push(values);
        start = i;
      }
    }
    let values: number[] = [];
    for (let i = start, len = handStrengths.length; i < len; i++) {
      values.push(<number> handStrengths[i][0]);
    }
    result.push(values);

    return result;
  }
}
