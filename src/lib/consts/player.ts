import currency from 'currency.js';

export default class Player {
  sid: string;
  name: string;
  seat: number;
  isinSeat: boolean;
  currBets: number;
  totalBets: number;
  stack: number;
  isinHand: boolean;
  toAct: boolean;

  constructor(sid: string, seat: number = -1, stack: number = 200) {
    this.sid = sid;
    this.name = sid;
    this.seat = seat;
    this.isinSeat = true;
    this.currBets = 0;
    this.totalBets = 0;
    this.stack = stack;
    this.isinHand = false;
    this.toAct = false;
  }

  topup(amount: number) {
    this.stack += amount;
  }

  bet(amount: number) {
    this.stack -= amount;
    this.currBets += amount;
  }
}