import type Card from './card';
import Player from "./player";
import { phases } from './';
import { mod } from '../utils';

export default class PokerTable {
  players: ( Player | undefined )[];
  isOngoing: boolean;
  bigBlind: Player | null;
  blinds: number;
  board: Card[];
  phase: typeof phases[number];
  phaseid: number;
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
    this.toMatch = 0;
    this.minRaise = 1;
  }

  clear() {
    this.board = [];
    this.phase = 'init';
    this.phaseid = 0;
    this.toMatch = 0;
    this.minRaise = 1;
  }

  nextPhase() {
    this.phaseid = (this.phaseid + 1) % phases.length;
    this.phase = phases[this.phaseid];
  }
  
  kickPlayers() {
    if (this.bigBlind && !this.bigBlind.isinHand && (!this.bigBlind.isinSeat || !this.bigBlind.stack)) {
      if (this.getinSeat().length) {
        let i = mod(this.bigBlind.seat - 1, this.players.length);
        let player = this.players[i];
        while (!player || !player.isinSeat) {
          i = mod(i - 1, this.players.length);
          player = this.players[i];
        }
        this.bigBlind = this.players[i] as Player;
      } else {
        this.bigBlind = null;
      }
    }

    this.players = this.players.map(player =>
      !player || ((!player.isinSeat || !player.stack) && !player.isinHand) ? undefined : player);
  }

  playerLeave(name: string) {
    const player = this.players.find(player => player?.sid === name) as Player;
    if (player) {
      player.isinSeat = false;
      console.log(`${name} has left`);
    }
    this.kickPlayers();
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
      player?.isinSeat) as Player[];
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
    const inPlay = this.players.filter(player => 
      player?.isinHand && (!player.toAct || player.currBets)) as Player[];
    
    // assume that a fold or bet(amt) where amt >= 0 is an action,
    // inPlay is an array of all players in the hand that have acted
    // and inHand is an array of all players in the hand.
    //
    // |inPlay| = |inHand| iff all players have acted. if all players
    // have acted, then they have either folded (|nHand| -= 1) or bet
    // an amount >= 0, and therefore |inPlay| = |inHand|
    if (inPlay.length !== this.getinHand().length) return false;

    // a betting round is resolved if every non-allin bet = highest bet.
    const resolved = inPlay.filter(player => player.stack > 0)
      .every(player => player.currBets === this.toMatch);
    
    // in the case of the bb and calls from other players during the preflop,
    // he will be counted in play due to the initial blinds. (currBets == true)
    // if bet is resolved but bb is yet to act, not resolved.
    if (this.phase === 'preflop' && resolved && this.bigBlind.toAct) return false;

    return resolved;
  }
}

/*

(side pots???)

*/