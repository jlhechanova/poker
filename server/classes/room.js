import PokerTable from './pokertable.js';

export default class Room {
  constructor(io, host, id, name, passcode) {
    this.host = host;
    this.id = id;
    this.name = name;
    this.passcode = passcode;
    this.pass = passcode ? true : false;
    this.table = new PokerTable(io, id);
  }

  auth(passcode) {
    return this.passcode === passcode;
  }

  toJSON() {
    return {
      host: this.host.name,
      id: this.id,
      name: this.name,
      pass: this.pass,
      blinds: this.table.blinds,
      curPlayers: this.table.curPlayers,
      maxPlayers: this.table.maxPlayers,
    }
  }
}