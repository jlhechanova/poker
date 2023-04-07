import currency from "currency.js";

export default class Player {
  sid: string;
  name: string;
  seat: number;
  stack: currency;
  bets: currency;
  isinSeat: boolean;
  isinHand: boolean;
  toAct: boolean;

  constructor(sid: string, name: string, seat: number, blinds: number) {
    this.sid = sid;
    this.name = name;
    this.seat = seat;
    this.stack = currency(blinds * 200);
    this.bets = currency(0);
    this.isinSeat = true;
    this.isinHand = false;
    this.toAct = false;
  }

  topup(amount: number) {
    this.stack = this.stack.add(amount);
  }

  bet(amount: number) {
    this.stack = this.stack.subtract(amount);
    this.bets = this.bets.add(amount);
  }
}