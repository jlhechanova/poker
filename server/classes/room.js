import PokerTable from './pokertable.js';

export default class Room {
  #passcode;

  constructor(io, host, id, name, passcode) {
    this.host = host;
    this.id = id;
    this.name = name;
    this.#passcode = passcode;
    this.table = new PokerTable(io, id);
  }

  auth(passcode) {
    return this.#passcode === passcode;
  }
}