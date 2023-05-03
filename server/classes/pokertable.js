import Player from "./player.js";
import Deck from "./deck.js";
import currency from 'currency.js';
import solver from 'pokersolver';
const { Hand } = solver;

export default class PokerTable {
  constructor(io, roomID, blinds = 1, maxPlayers = 4) {
    this.io = io;
    this.roomID = roomID;
    this.players = Array.from({length: maxPlayers});
    this.blinds = blinds;
    this.deck = new Deck();
    this.hands = [];
    this.curPlayers = 0;
    this.maxPlayers = maxPlayers;
    this.isOngoing = null;
    this.isPaused = true;
    this.turn = undefined;
    this.button = undefined;
    this.smBlind = undefined;
    this.bigBlind = undefined;
    this.phaseid = 1;
    this.board = [];
    this.curPot = currency(0);
    this.pot = currency(0);
    this.toMatch = 0;
    this.minRaise = 2 * blinds;
    this.aggressor = undefined;
  }

  async run() {
    let {io, roomID, phaseid} = this;
    if (phaseid) {
      if (this.turn !== undefined) { // resume a paused betting round
        await this.betRound();
      } else {
        if (phaseid === 1) {
          this.preflop();
        } else {
          this.street();
        }

        // at most 1 player in the hand with a stack means allins; skip betting
        if (this.players.reduce((acc, player) => player?.isinHand 
          && player.stack.value ? acc + 1 : acc, 0) > 1)
        {
          this.turn = this.nextActingPlayer(phaseid === 1 ? 
            this.bigBlind : this.button); // utg if preflop else sb

          io.to(roomID).emit('tableState', {
            players: this.players,
            turn: this.turn,
            curPot: this.curPot,
            toMatch: this.toMatch,
            minRaise: this.minRaise,
          });

          await this.betRound();
        }
      }
    } else if (this.board.length) {
      await this.showdown();
      this.posthand();
    }

    if (this.turn !== undefined) return; // pause betting, dont incr phase

    this.isOngoing = setTimeout(async () => {
      this.isOngoing = null;
      if (this.isPaused) return;

      if (this.curPlayers > 1) {
        this.phaseid = ++phaseid % 5;
        io.to(roomID).emit('tableState', {phaseid: phaseid});
        this.run();
      } else {
        this.isPaused = true;
      }
    }, 1000);
  }

  preflop() {
    const {io, roomID, players, blinds, deck, hands} = this;

    // generate hands and set players in the hand
    players.forEach(player => {
      if (player) {
        const hand = deck.draw(2);
        hands.push(hand);
        player.toAct = true;
        player.isinHand = true;
        io.to(player.sid).emit('hand', hand);
      } else {
        hands.push(undefined);
      }
    });

    // update key positions
    let button = this.nextActingPlayer(this.button);
    let smBlind = this.nextActingPlayer(button);
    let bigBlind = this.nextActingPlayer(smBlind);
    
    if (button === bigBlind) { // implies only 2 players. swap
      bigBlind = smBlind;
      smBlind = button;
    }

    this.button = button;
    this.smBlind = smBlind;
    this.bigBlind = bigBlind;

    // post blinds
    const sb = players[smBlind];
    const bb = players[bigBlind];
    sb.bet(Math.min(sb.stack.value, blinds));
    bb.bet(Math.min(bb.stack.value, 2 * blinds));
    this.curPot = bb.totalBet.add(sb.totalBet);
    this.toMatch = Math.max(bb.totalBet.value, sb.totalBet.value);

    io.to(roomID).emit('tableState', {
      players: players,
      button: button,
      curPot: this.curPot,
      toMatch: this.toMatch,
    })
  }

  street() {
    const {io, roomID, phaseid, deck} = this;
    if (phaseid === 2) { // flop
      this.board = deck.draw(3);
    } else { // turn/river
      this.board.push(deck.draw()[0]);
    }

    io.to(roomID).emit('tableState', {
      board: this.board,
    });
  }

  async betRound() {
    const player = this.players[this.turn];
    let action = 'check';

    // get action from user
    if (!player.isinSeat) { // skip player dc
      action = 'fold';
    } else {
      try {
        const res = await this.io.to(player.sid)
          .timeout(15000).emitWithAck('action');
        if (res.length) action = res[0];
      } catch (e) { // dc during turn?
        action = 'fold';
      }
    }

    if (action === 'pause') return;

    player.toAct = false;
    const {stack, curBet} = player;
    const {toMatch, minRaise, curPot} = this;

    if (action === 'check' && curBet.value < toMatch) { // afk
      action = 'fold';
    }

    switch (action) {
      case 'check':
        break;

      case 'fold':
        player.isinHand = false;
        break;

      case 'call':
        let callAmt = Math.min(stack.value, toMatch - curBet.value);

        player.bet(callAmt);
        this.curPot = curPot.add(callAmt);
        break;

      default: // raise
        let amount = Number(action); // should be an int, cast for checking

        if (isNaN(amount)) { // invalid input -> fold
          player.isinHand = false;
        } else {
          let callAmt = Math.min(stack.value, toMatch - curBet.value);

          // ensure amount is at least minRaise
          amount = Math.max(callAmt + minRaise, amount);
          player.bet(amount);

          // update values for pot, amount to match, min raise, and aggressor
          this.curPot = curPot.add(amount);
          this.toMatch = curBet.value;
          this.minRaise = Math.max(curBet.subtract(toMatch).value, minRaise);
          this.aggressor = player.seat;
        }
    }

    this.turn = this.betResolved() ? undefined : this.nextActingPlayer(this.turn);

    this.io.to(this.roomID).emit('tableState', {
      players: this.players,
      turn: this.turn,
      curPot: this.curPot,
      toMatch: this.toMatch,
      minRaise: this.minRaise,
    })

    this.turn === undefined ? this.betInit() : await this.betRound();
  }

  betResolved() {
    const inHand = this.players.filter(player => player?.isinHand);
    if (inHand.length === 1) { // everyone else has folded
      this.phaseid = 4; // this will skip over remaining streets
      return true;
    }

    if (inHand.reduce((acc, player) => player?.toAct ? acc + 1 : acc, 0)) {
      return false; // some players have not yet acted
    }

    // resolved if every non-allin bet === highest bet
    return inHand.every(player => !player.stack.value 
      || player.curBet.value === this.toMatch);
  }

  betInit() {
    this.curPot = currency(0);
    this.toMatch = 0;
    this.minRaise = 2 * this.blinds;
    this.players.forEach(player => {
      if (player) {
        if (player.isinHand && player.stack.value) player.toAct = true;
        player.curBet = currency(0);
      }
    })
  }

  async showdown() {
    const {io, roomID, players} = this;
    let pot = this.pot;
    let inHand = players.filter(player => player?.isinHand);

    if (inHand.length === 1) {
      inHand[0].winnings = pot;
      this.pot = currency(0);
      players.forEach(player => {
        if (player?.totalBet.value) player.totalBet = currency(0);
      });

      io.to(roomID).emit('tableState', {players: players});
      return;
    }

    const {board, hands} = this;
    let solvedHands = inHand.map(player => 
      Hand.solve(board.concat(hands[player.seat])));

    while (pot.value) {
      const best = Hand.winners(solvedHands);
      const seats = best.map(hand => solvedHands.indexOf(hand));
      let winners = seats.map(seat => inHand[seat]);
      while (winners.length) {
        // get total bet amount of player with lowest money in the pot
        const minAmt = winners.length === 1 ? winners[0].totalBet.value
        : winners.reduce((prev, curr) => {
          const a = prev.totalBet.value;
          const b = curr.totalBet.value;
          return a < b ? a : b;
        });

        // solve for main pot by collecting at most minAmt from each player
        const mainPot = players.reduce((acc, player) => {
          if (player?.totalBet.value) {
            const amount = Math.min(player.totalBet.value, minAmt);
            player.totalBet = player.totalBet.subtract(amount);
            acc = acc.add(amount);
          }
          return acc;
        }, currency(0));

        if (winners.length === 1) {
          winners[0].winnings.add(mainPot);
        } else { // chop
          mainPot.distribute(winners.length).forEach((curr, i) =>
            winners[i].winnings.add(curr));
        }

        // remove player(s) that have received their max possible winnings
        winners = winners.filter(player => player.totalBet.value);
        pot = pot.subtract(mainPot);
      }

      await io.to(roomID).timeout(3000).emit('showdown', {
        players: players,
        best: best.toString().replace(/\s|10/g, m => m === '10' ? 'T' : '').split(','),
        hands: hands.map((hand, i) => seats.includes(i) || this.aggressor === i ? hand : undefined),
      });

      seats.forEach(seat => {
        const player = players[seat];
        player.stack = player.stack.add(player.winnings);
        player.winnings = currency(0);
      })

      // remove winning players, hands
      inHand = inHand.filter(player => !seats.includes(player.seat));
      solvedHands = solvedHands.filter(hand => !best.includes(hand));
    }
  }

  posthand() { // clean up
    const {io, roomID, players} = this;
    this.board = [];
    players.forEach(player => {
      if (player) {
        if (!player.stack.value) {
          player.isinSeat = false;
          io.to(player.sid).emit('out');
        }

        if (player.isinSeat) {
          player.isinHand = false;
          io.to(player.sid).emit('hand');
        } else {
          this.kick(player);
        }
      }
    });

    io.to(roomID).emit('tableState', {
      players: players,
      board: this.board,
    });
  }

  playerJoin(sid, name, seat, oldSeat) {
    const players = this.players;
    let player = players[seat];
    if (player) return false; // seat somehow already taken

    if (oldSeat === undefined) { // new player!
      player = new Player(sid, name, seat, this.blinds * 200);
      this.curPlayers++;
    } else {
      player = players[oldSeat];

      if (player.isinHand) return false; // dont allow change if in hand

      players[oldSeat] = undefined;
      player.seat = seat;
    }

    players[seat] = player;
    if (this.button === undefined) this.button = seat;
    return true;
  }

  playerLeave(seat) {
    let player = this.players[seat];
    if (player) {
      if (!player.totalBet.value) {
        this.kick(seat);
      } else {
        player.isinSeat = false;
      }
    }
  }

  kick(seat) {
    this.players[seat] = undefined;
    this.curPlayers--;
  }

  // returns seat of the next acting player after a given player seat
  nextActingPlayer(seat) {
    const {players, maxPlayers} = this;
    let player = players[++seat];
    while (!player || !(player.isinHand && player.stack.value)) {
      seat = (seat + 1) % maxPlayers;
      player = players[seat];
    }
    return seat;
  }

  toJSON() {
    return {
      players : this.players,
      blinds : this.blinds,
      isPaused : this.isPaused,
      turn : this.turn,
      button : this.button,
      phaseid : this.phaseid,
      board : this.board,
      pot : this.pot.value,
      curPot : this.curPot.value,
      toMatch : this.toMatch,
      minRaise : this.minRaise,
    }
  }
}