import PokerTable from './pokertable';
import type Card from './card';
import Deck from './deck';

interface Host {
  sid: string,
  name: string
}

export default class Room {
  host: Host;
  id: string;
  name: string;
  passcode: string;
  deck: Deck;
  hands: (Card[] | undefined)[];
  table: PokerTable;

  constructor(host: Host, id: string, name: string, passcode: string, players: number, blinds: number) {
    this.host = host;
    this.id = id;
    this.name = name;
    this.passcode = passcode;
    this.deck = new Deck();
    this.hands = [];
    this.table = new PokerTable(blinds, players);
  }
}