import currency from 'currency.js';

export default class Player {
  sid: string;
  name: string;
  stack: currency;
  seat: number;
  isPlaying: boolean;

  constructor(sid: string, seat: number = -1, stack: number = 200) {
    this.sid = sid;
    this.name = sid;
    this.stack = currency(stack);
    this.seat = seat;
    this.isPlaying = false;
  }
}