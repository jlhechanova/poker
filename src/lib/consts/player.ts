import currency from 'currency.js';

export default class Player {
  sid: string;
  name: string;
  seat: number;
  isinSeat: boolean;
  bets: number;
  totalbet: number;
  stack: number;
  isinHand: boolean;
  toAct: boolean;

  constructor(sid: string, seat: number = -1, stack: number = 200) {
    this.sid = sid;
    this.name = sid;
    this.seat = seat;
    this.isinSeat = true;
    this.bets = 0;
    this.totalbet = 0;
    this.stack = stack;
    this.isinHand = false;
    this.toAct = false;
  }

  topup(amount: number) {
    this.stack += amount;
  }

  bet(amount: number) {
    this.stack -= amount;
    this.bets += amount;
    this.totalbet += amount;
  }
}