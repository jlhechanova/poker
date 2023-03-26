import currency from "currency.js"
import { ranks, suits } from "./";
import Player from "./player";
import type Card from './card';

const phases = ["init", "preflop", "flop", "turn", "river", "showdown"] as const;

export default class PokerTable {
  isOngoing: boolean;
  players: Player[];
  bigBlind: number;
  board: Card[];
  deck: Card[];
  phase: number;
  pot: currency;

  constructor() {
    this.isOngoing = false;
    this.players = Array.from({length: 10});
    this.bigBlind = 0;
    this.board = [];
    this.deck = [];
    this.phase = 0;
    this.pot = currency(0);
  }

  reset() {
    this.board = [];
    this.makeDeck();
    this.phase = 0;
    this.pot = currency(0);
  }
  
  makeDeck() {
    this.deck = suits
      .map(suit => ranks.map(rank => ({ rank: rank, suit: suit })))
      .reduce((prev, curr) => prev.concat(curr));
  }

  deal() {
    const i = Math.floor(Math.random() * this.deck.length);
    return this.deck.splice(i, 1)[0];
  }

  nextPhase() {
    this.phase = (this.phase + 1) % phases.length;
  }

  playerJoin(name: string) {
    console.log(`Player ${name} has connected`);
    this.players[this.playersSeated().length] = new Player(name, this.playersSeated().length);
  }

  playerKick(name: string) {
    const player = this.players.find(player => player?.sid === name);
    this.players[player.seat] = undefined;
  }

  playersSeated() {
    return this.players.filter(player => player && player.seat >= 0);
  }

  playersinHand() {
    return this.players.filter(player => player && player.isPlaying);
  }
}

/*
table loop?
  prehand
    make deck
    get active players
    reset pot
    post blinds
    
  preflop
    deal hole cards
    betting phase
    
  flop
    deal community cards
    betting phase

  turn
    deal community card
    betting phase

  river
    deal community card
    betting phase

  showdown
    show hole cards of players

  posthand
    kick zero balance players
    increment button


BET PHASE
fold/call/raise

fold/check/raise

keep bets array, check if all values are equal? (side pots???)

*/