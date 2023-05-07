import currency from "currency.js";

export default class Player {
  constructor(sid, name, seat, stack) {
    this.sid = sid;
    this.name = name;
    this.seat = seat;
    this.stack = currency(stack);
    this.totalBet = currency(0);
    this.curBet = currency(0); // doubles as winnings field
    this.isinSeat = true;
    this.isinHand = false;
    this.toAct = false;
  }

  bet(amount) {
    this.stack = this.stack.subtract(amount);
    this.curBet = this.curBet.add(amount);
    this.totalBet = this.totalBet.add(amount);
  }
}