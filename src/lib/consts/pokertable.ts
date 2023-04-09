import type Card from './card';
import Player from "./player";
import { phases } from './';
import { mod } from '../utils';
import currency from 'currency.js';

export default class PokerTable {
  players: ( Player | undefined )[];
  curPlayers: number;
  maxPlayers: number;
  isOngoing: boolean;
  bigBlind: Player | null;
  blinds: number;
  board: Card[];
  phase: typeof phases[number];
  phaseid: number;
  currPot: currency;
  pot: currency;
  toMatch: number;
  minRaise: number;

  constructor(blinds: number, players: number) {
    this.players = Array.from({length: players});
    this.curPlayers = 0;
    this.maxPlayers = players;
    this.isOngoing = false;
    this.bigBlind = null;
    this.blinds = blinds;
    this.board = [];
    this.phase = 'prehand';
    this.phaseid = 0;
    this.currPot = currency(0);
    this.pot = currency(0);
    this.toMatch = 0;
    this.minRaise = 2 * blinds;
  }

  nextPhase() {
    this.phaseid = (this.phaseid + 1) % phases.length;
    this.phase = phases[this.phaseid];
  }

  kick(player: Player) {
    this.players[player.seat] = undefined;
    if (player === this.bigBlind) {
      if (!this.getinSeat().length) {
        this.bigBlind = null;
      } else {
        let i = mod(this.bigBlind.seat - 1, this.players.length);
        while (!this.players[i]) {
          i = mod(i - 1, this.players.length);
        }
        this.bigBlind = this.players[i] as Player;
      }
    }
    this.curPlayers--;
  }

  playerLeave(id: string | number) {
    let player = typeof id === 'number' ? this.players[id] :
      this.players.find(player => player && player.sid === id);

    if (player) {
      player.isinSeat = false;
      if (!this.isOngoing || !player.isinHand) this.kick(player);
    }
  }

  playerJoin(sid: string, name: string, seat: number) {
    let player = this.players.find(player => player && player.sid === sid);
    if (player) {
      if (this.phaseid !== 0) return;

      console.log(`Player ${name} switched from seat ${player.seat} to seat ${seat}`);
      this.players[player.seat] = undefined;
      player.seat = seat;
    } else {
      console.log(`Player ${name} has joined the table`);
      player = new Player(sid, name, seat, this.blinds);
      this.curPlayers++;
    }

    this.players[seat] = player;
    if (!this.bigBlind) {
      this.bigBlind = player;
    }
  }

  getinSeat() {
    return this.players.filter(player => 
      player?.isinSeat && player.stack.value > 0) as Player[];
  }

  getinHand() {
    return this.players.filter(player => 
      player?.isinHand) as Player[];
  }

  getinPlay() {
    return this.players.filter(player => 
      player?.isinHand && player.stack.value > 0) as Player[];
  }

  resolveBets() {
    // players still in the hand that have made an action
    const inRound = this.players.filter(player => 
      player?.isinHand && !player.toAct) as Player[];
    
    const inHand = this.getinHand();

    // if only one player left in the hand, resolved
    if (inHand.length === 1) return true;

    // assume that a fold or bet(n) where n >= 0 is an action,
    //
    // |inRound| = |inHand| iff all players in the hand have acted. 
    // if all players have acted, then they either folded (|inHand| -= 1) 
    // or bet an amount >= 0 (|inRound| += 1), so |inRound| = |inHand|
    if (inRound.length !== inHand.length) return false;

    // resolved if every non-allin bet === highest bet
    const resolved = inRound.filter(player => player.stack.value > 0)
      .every(player => player.curBets.value === this.toMatch);

    return resolved;
  }
}