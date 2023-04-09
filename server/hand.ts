import type Room from '../src/lib/consts/room';
import type { Server } from "socket.io";
import { mod, calculateHandOutcome } from '../src/lib/utils';
import currency from 'currency.js';
import type Player from '../src/lib/consts/player';

const prehand = (room: Room, io: Server) => {
  const table = room.table;
  table.players.forEach(player => {
    if (player) {
      if (player.isinSeat && player.stack.value > 0) {
        player.isinHand = true;
        player.toAct = true;
        player.bets = currency(0);
      } else {
        table.kick(player);
      }
    }
  })

  room.hands = [];
  room.deck.deck();
  io.to(room.id).emit('table', table);
}

const preflop = (room: Room, io: Server) => {
  const table = room.table;

  const players = table.getinSeat();

  // update bb
  let i = players.findIndex(player => player === table.bigBlind);
  table.bigBlind = players[(i + 1) % players.length];

  // post blinds
  const bb = players[(i + 1) % players.length]
  const sb = players[(i + 2) % players.length]
  bb.bet(Math.min(bb.stack.value, 2 * table.blinds));
  sb.bet(Math.min(sb.stack.value, table.blinds));
  table.pot = table.pot.add(3 * table.blinds);
  table.toMatch = 2 * table.blinds;
  table.minRaise = table.toMatch;

  // deal hands
  const deck = room.deck;
  const hands = room.hands;
  table.players.forEach(player => {
    if (player) {
      const hand = [deck.deal(), deck.deal()];
      io.to(player.sid).emit('hand', hand);
      hands.push(hand);
    } else {
      hands.push(undefined);
    }
  })
  io.to(room.id).emit('table', table);
}

const street = (room: Room, io: Server) => {
  const table = room.table;
  const deck = room.deck;

  if (table.phaseid == 2) { // flop
    table.board = [deck.deal(), deck.deal(), deck.deal()];
  } else { // turn/river
    table.board.push(deck.deal());
  }

  io.to(room.id).emit('table', table);
}

const showdown = (room: Room, io: Server) => {
  const table = room.table;
  const hands = room.hands;
  const inHand = table.getinHand();

  if (inHand.length === 1) {
    inHand[0].topup(table.pot.value);
    table.pot = currency(0);
    return;
  }

  const result = calculateHandOutcome(table.board, hands);
  const ranking = Array.from(result.entries());

  let i = 0;
  while (table.pot.value) {
    let winners = ranking[i][1];
    while (winners.length) {
      // assuming more than 1 player in this hand strength,
      // get player with lowest money in pot.
      // (doesnt matter if only one player since this will
      // just calculate their max possible winnings then
      // move to next tier if there is still money in the pot)
      const min = winners.reduce((prev, curr) =>
        table.players[prev].bets.value < table.players[curr].bets.value ? prev : curr);
      const minPlayer = table.players[min] as Player;

      // collect minPlayer bet amount from each player in the pot.
      // this is the main pot / series of sidepots
      const pot = table.players.reduce((acc, player) => {
        if (player && player.bets.value) {
          const amount = Math.min(minPlayer.bets.value, player.bets.value);
          player.bets = player.bets.subtract(amount);
          acc = acc.add(amount);
        }
        return acc;
      }, currency(0));
  
      // subtract this pot from table pot.
      table.pot = table.pot.subtract(pot);

      // distribute this pot to all players in this hand strength.
      const dist = pot.distribute(winners.length);
      dist.forEach((cur, idx) => table.players[winners[idx]].topup(cur.value));

      // remove player(s) that have received their max possible winnings
      winners = winners.filter(seat => table.players[seat].bets.value);
    }

    i++;
  }
}

const posthand = (room: Room, io: Server) => {
  const table = room.table;
  table.players.forEach(player => {
    if (player) {
      player.isinHand = false;

      if (!player.stack.value) player.isinSeat = false;

      if (!player.isinSeat) {
        table.kick(player);
        io.to(player.sid).emit('out');
      }
    }
  });

  if (table.curPlayers < 2) table.isOngoing = false;

  table.board = [];
  io.to(room.id).emit('hand');
  io.to(room.id).emit('table', table);
}

/*  BETTING ROUND
 *  1. find first to play
 *  2. player actions until betting round ends.
 * 
 *  the betting round ends in three ways:
 *  1. only 1 player left in the hand
 *     (everyone else has folded)
 *  2. at most 1 player left with a stack
 *     (implies multiple people in the hand, which implies
 *     they went all in since they do not have a stack)
 *  3. all non-allin bets are equal to the highest bet
 *  
 *  handled by the PokerTable.resolveBets() method.
 */
const betRound = async (room: Room, io: Server) => {
  const table = room.table;
  const hands = room.hands;
  const numPlayers = table.players.length;
  
  let i = table.bigBlind.seat;
  if (table.phaseid === 1) { // preflop, find utg
    i = mod(i - 1, numPlayers);
  } else { // find sb
    i = (i + 1) % numPlayers;
    while (!table.players[i]) i = (i + 1) % numPlayers;
  }
  let player = table.players[i];
  while (!table.resolveBets()) {
    // skip players not in hand or zero stack;
    while (!player || !player.isinHand || !player.stack.value) {
      i = mod(i - 1, numPlayers);
      player = table.players[i];
    }

    let action = 'check';
    player.toAct = false;

    // get action from user
    try {
      const res = await io.to(player.sid)
        .timeout(15000).emitWithAck('action');
      if (res.length) action = res[0];
    } catch (err) { // client disconnect?
      action = 'fold';
    }

    console.log(action);

    if (action === 'check' && player.curBets.value < table.toMatch) {
      action = 'fold';
    }

    switch(action) {
      case 'check':
        break;
      
      case 'fold':
        player.isinHand = false;
        player.bets = player.bets.add(player.curBets);
        hands[player.seat] = undefined;
        break;

      case 'call':
        let callAmt = table.toMatch - player.curBets.value
        let amount = Math.min(callAmt, player.stack.value);
        player.bet(amount);
        table.currPot = table.currPot.add(amount);
        break;

      default:
        let bet = Number(action);

        if (isNaN(bet)) { // invalid input -> fold
          player.isinHand = false;
          player.bets = player.bets.add(player.curBets);
          hands[player.seat] = undefined;
        } else {
          let callAmt = table.toMatch - player.curBets.value;
          bet = Math.max(bet, callAmt + table.minRaise);

          let amount = Math.min(bet, player.stack.value);
          player.bet(amount);
          table.currPot = table.currPot.add(amount);

          table.minRaise = player.curBets.subtract(table.toMatch).value;
          table.toMatch = player.curBets.value;
        }
    }

    if (!player.isinSeat && !player.isinHand) {
      table.kick(player);
    }

    io.emit('table', table);
    i = mod(i - 1, numPlayers);
    player = table.players[i];
  }
  
  // set for next betting round
  table.players.forEach(player => {
    if (player) {
      if (player.curBets) {
        player.bets = player.bets.add(player.curBets);
        player.curBets = currency(0);
      }

      if (player.isinHand && player.stack.value) player.toAct = true;
    }
  });
  table.toMatch = 0;
  table.minRaise = 2 * table.blinds;

  table.pot = table.pot.add(table.currPot);
  table.currPot = currency(0);

  // if only one player left after betting, skip to showdown.
  if (table.getinHand().length === 1) {
    table.phaseid = 4; // will increment after return
    table.phase = 'river';
  }
}

const runHand = (room: Room, io: Server) => {
  const table = room.table;
  let flop, turn, river;
  flop = turn = river = street;
  const phases = [prehand, preflop, flop, turn, river, showdown, posthand];

  const runPhase = async () => {
    console.log(table.phase)
    let phaseid = table.phaseid
    phases[phaseid](room, io);
    
    if (phaseid >= 1 && phaseid <= 4 && table.getinPlay().length > 1) 
    {
      await betRound(room, io);
    }

    if (table.phaseid || (table.getinSeat().length >= 2 && table.isOngoing)) {
      table.nextPhase();
      setTimeout(() => {
        runPhase();
      }, phaseid === 5 ? 2000 : 1000);
    } else {
      table.isOngoing = false;
    }
  }

  runPhase();
}

export default runHand;