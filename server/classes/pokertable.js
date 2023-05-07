import Player from "./player.js";
import Deck from "./deck.js";
import currency from 'currency.js';
import solver from 'pokersolver';
const { Hand } = solver;

const PREFLOP = 1, FLOP = 2, TURN = 3, RIVER = 4; // 0 is posthand
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default class PokerTable {
  constructor(io, roomID, blinds = 1, maxPlayers = 4) {
    this.io = io;
    this.roomID = roomID;
    this.players = Array.from({length: maxPlayers});
    this.blinds = blinds;
    this.deck = new Deck();
    this.best = null;
    this.hands = [];
    this.curPlayers = 0;
    this.maxPlayers = maxPlayers;
    this.isOngoing = null;
    this.isPaused = true;
    this.turn = null;
    this.button = null;
    this.bigBlind = null;
    this.phase = PREFLOP;
    this.board = [];
    this.curPot = currency(0);
    this.pot = currency(0);
    this.toMatch = 0;
    this.minRaise = 2 * blinds;
  }

  async run() {
    let {io, roomID, phase} = this;
    if (phase) {
      if (this.turn !== null) { // resume a paused betting round
        await this.betRound();
      } else {
        if (phase === PREFLOP) {
          this.preflop();
        } else {
          this.street();
        }

        // proceed with betting only if some players are to act
        if (this.players.reduce((acc, player) => 
          player?.toAct ? acc + 1 : acc, 0))
        {
          this.turn = this.nextActingPlayer(phase === PREFLOP ? 
            this.bigBlind : this.button); // utg if preflop else sb

          io.to(roomID).emit('tableState', {turn: this.turn});

          await this.betRound();
        } else {
          // allins; emit hands a la pokerstars
          io.to(roomID).emit('tableState', {
            hands: this.hands.map((hand, i) => 
              this.players[i]?.isinHand ? hand : undefined),
          })
        }
      }
    } else if (this.hands.length) {
      await this.showdown();
      this.posthand();
    }

    if (this.turn !== null) return; // round not over, dont incr phase

    this.isOngoing = setTimeout(() => {
      this.isOngoing = null;
      if (this.isPaused) return;

      if (this.curPlayers > 1) {
        this.phase = (this.phase + 1) % 5;
        io.to(roomID).emit('tableState', {
          players: this.players,
          phase: this.phase,
          pot: this.pot,
          curPot: this.curPot,
          toMatch: this.toMatch,
          minRaise: this.minRaise,
        });
        this.run();
      } else {
        this.isPaused = true;
        io.to(roomID).emit('tableState', {isPaused: true});
      }
    }, 1000);
  }

  preflop() {
    const {io, players, blinds, deck, hands} = this;

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

    // find key seats
    let button = this.nextActingPlayer(this.button);
    let smBlind = this.nextActingPlayer(button);
    let bigBlind = this.nextActingPlayer(smBlind);
    
    if (button === bigBlind) { // implies only 2 players. swap
      bigBlind = smBlind;
      smBlind = button;
    }

    // update key seats
    this.button = button;
    this.bigBlind = bigBlind;

    // post blinds
    const sb = players[smBlind];
    const bb = players[bigBlind];
    sb.bet(Math.min(sb.stack.value, blinds));
    bb.bet(Math.min(bb.stack.value, 2 * blinds));
    if (!sb.stack.value) sb.toAct = false;
    if (!bb.stack.value) bb.toAct = false;
    this.pot = bb.totalBet.add(sb.totalBet);
    this.toMatch = Math.max(bb.totalBet.value, sb.totalBet.value);

    io.to(this.roomID).emit('tableState', {
      players: players,
      button: button,
      pot: this.pot,
      toMatch: this.toMatch,
    });
  }

  street() {
    const {phase, deck} = this;
    if (phase === FLOP) {
      this.board = deck.draw(3);
    } else { // turn/river
      this.board.push(deck.draw()[0]);
    }
    this.io.to(this.roomID).emit('tableState', {board: this.board});
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
      } catch (e) { // timed out
        if (!player.isinSeat) { // player left during their turn?
          action = 'fold';
        }
      }
    }

    if (action === 'pause' || this.isPaused) return;

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
        const callAmt = Math.min(toMatch - curBet.value, stack.value);

        player.bet(callAmt);
        this.curPot = curPot.add(callAmt);
        break;

      default: // raise
        let amount = Number(action); // convert for checking

        if (isNaN(amount)) { // invalid input -> fold
          player.isinHand = false;
        } else {
          const callAmt = toMatch - curBet.value;

          // ensure amount is at least min raise or at most player stack
          amount = Math.min(stack.value,
            Math.max(callAmt + minRaise, amount));
          player.bet(amount);

          this.curPot = curPot.add(amount);
          this.minRaise = Math.max(minRaise, player.curBet.subtract(toMatch).value);
          this.toMatch = player.curBet.value;
        }
    }

    this.turn = this.betResolved() ? null : this.nextActingPlayer(this.turn);

    // emit state before possible reset to show this action in client
    this.io.to(this.roomID).emit('tableState', {
      players: this.players,
      turn: this.turn,
      curPot: this.curPot,
      toMatch: this.toMatch,
      minRaise: this.minRaise,
    });

    this.turn === null ? this.betClear() : await this.betRound();
  }

  betResolved() {
    const inHand = this.players.filter(player => player?.isinHand);
    if (inHand.length === 1) { // everyone else has folded
      this.phase = RIVER; // this will skip over remaining streets
      return true;
    }

    if (inHand.reduce((acc, player) => player?.toAct ? acc + 1 : acc, 0)) {
      return false; // some players have not yet acted
    }

    // true if every non-allin bet === highest bet.
    const resolved = inHand.every(player => !player.stack.value 
      || player.curBet.value === this.toMatch);

    if (resolved) { // normalize pot and max player bet amount
      const max = inHand.find(player => // find player with highest bet
        player.curBet.value === this.toMatch);
      const next = inHand.reduce((prev, curr) => { // next highest bet
        if (prev === max) return curr;
        return curr === max || prev.totalBet.value > curr.totalBet.value ? 
          prev : curr;
      });

      // if max player bet is higher than next highest bet,
      // return excess to max player and adjust pot amount
      if (max.totalBet.value > next.totalBet.value) {
        const excess = max.totalBet.subtract(next.totalBet).value;
        this.curPot = this.curPot.subtract(excess);
        max.stack = max.stack.add(excess);
        max.curBet = currency(next.curBet);
        max.totalBet = currency(next.totalBet);
      }
    }
    return resolved;
  }

  betClear() {
    const {players, blinds, curPot} = this;
    if (curPot.value) {
      this.pot = this.pot.add(curPot);
      this.toMatch = 0;
      this.minRaise = 2 * blinds;
      this.curPot = currency(0);
    }

    const toAct = players.reduce((acc, player) => 
      player?.isinHand && player.stack.value ? acc + 1 : acc, 0);
    
    players.forEach(player => {
      if (player) {
        // at most one player in the hand with a stack implies allins; 
        // dont set players to act.
        if (toAct > 1 && player.isinHand && player.stack.value) player.toAct = true;
        if (player.curBet.value) player.curBet = currency(0);
      }
    });
  }

  async showdown() {
    const {io, roomID, players} = this;
    let pot = this.pot;
    this.pot = currency(0);
    let inHand = players.filter(player => player?.isinHand);

    if (inHand.length === 1) {
      const player = inHand[0];
      player.curBet = pot;
      players.forEach(player => {
        if (player?.totalBet.value) player.totalBet = currency(0);
      });

      io.to(roomID).emit('tableState', {
        players: players,
        pot: this.pot,
      });

      player.stack = player.stack.add(player.curBet);
      player.curBet = currency(0);

      await sleep(1000);

      return;
    }

    const {board, hands} = this;
    let solvedHands = inHand.map(player => 
      Hand.solve(board.concat(hands[player.seat])));

    while (pot.value) { // uses fact that pot === sum of player bets
      const best = Hand.winners(solvedHands);
      const seats = best.map(hand => solvedHands.indexOf(hand));
      let winners = seats.map(seat => inHand[seat]);
      while (winners.length) {
        // get lowest bet amount from winning players
        const minAmt = winners.length === 1 ? winners[0].totalBet.value
        : winners.reduce((prev, curr) => {
          const a = prev.totalBet.value, b = curr.totalBet.value;
          return a < b ? a : b;
        });

        // solve for main pot by collecting minAmt from each player's bet.
        const mainPot = players.reduce((acc, player) => {
          if (player?.totalBet.value) {
            const amount = Math.min(player.totalBet.value, minAmt);
            player.totalBet = player.totalBet.subtract(amount);
            acc = acc.add(amount);
          }
          return acc;
        }, currency(0));

        mainPot.distribute(winners.length).forEach((curr, i) => {
          const winner = winners[i];
          winner.curBet = winner.curBet.add(curr); // curBet doubles as winnings
        });

        // remove player(s) that have received their max possible winnings
        winners = winners.filter(player => player.totalBet.value);
        pot = pot.subtract(mainPot);
      }

      io.to(roomID).emit('tableState', {
        players: players,
        best: [best[0].name, best.toString().replace(/10/g, 'T').replace(/1/g, 'A')],
        pot: pot,
      });

      // add winnings to stack
      seats.forEach(seat => {
        const player = inHand[seat];
        player.stack = player.stack.add(player.curBet);
        player.curBet = currency(0);
      })

      // remove winning players, hands
      inHand = inHand.filter(player => !seats.includes(player.seat));
      solvedHands = solvedHands.filter(hand => !best.includes(hand));

      await sleep(5000);
    }
  }

  posthand() { // clean up
    const {io, roomID, players} = this;
    this.board = [];
    this.hands = [];
    this.deck.init();
    players.forEach(player => {
      if (player) {
        io.to(player.sid).emit('hand');
        if (!player.stack.value) {
          player.isinSeat = false;
        }

        if (player.isinSeat) {
          player.isinHand = false;
        } else {
          this.kick(player.seat);
          io.to(player.sid).emit('out');
        }
      }
    });

    io.to(roomID).emit('tableState', {
      players: players,
      best: null,
      hands: Array.from({length: this.maxPlayers}),
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
    if (this.button === null) this.button = seat;
    this.io.to(this.roomID).emit('tableState', {
      players: players,
      curPlayers: this.curPlayers,
    })
    return true;
  }

  playerLeave(seat) {
    let player = this.players[seat];
    if (player) {
      if (player.totalBet.value) {
        player.isinSeat = false;
      } else {
        this.kick(seat);
      }
    }
  }

  kick(seat) {
    this.players[seat] = undefined;
    this.curPlayers--;
    this.io.to(this.roomID).emit('tableState', {
      players: this.players,
      curPlayers: this.curPlayers,
    })
  }

  // returns seat of the next acting player after a given player seat
  nextActingPlayer(seat) {
    const {players, maxPlayers} = this;
    let player = players[++seat % maxPlayers];
    while (!player || !player.isinHand || !player.toAct && !player.stack.value) {
      seat = (seat + 1) % maxPlayers;
      player = players[seat];
    }
    return seat;
  }

  toJSON() {
    return {
      players : this.players,
      blinds : this.blinds,
      best: null,
      hands: Array.from({length: this.maxPlayers}),
      curPlayers: this.curPlayers,
      maxPlayers: this.maxPlayers,
      isPaused : this.isPaused,
      turn : this.turn,
      button : this.button,
      phase : this.phase,
      board : this.board,
      pot : this.pot.value,
      curPot : this.curPot.value,
      toMatch : this.toMatch,
      minRaise : this.minRaise,
    }
  }
}