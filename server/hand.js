import currency from 'currency.js';

const prehand = (room, io) => {
  const table = room.table;
  table.players.forEach(player => {
    if (player) {
      if (player.isinSeat && player.stack.value > 0) {
        player.isinHand = true;
        player.toAct = true;
        player.bets = currency(0);
        player.curBets = currency(0);
      } else {
        table.kick(player);
      }
    }
  })

  room.hands = [];
  room.deck.init();
  io.to(room.id).emit('table', table);
}

const preflop = (table) => {
  const {players, blinds, deck, hands, maxPlayers: numPlayers} = table;

  let button = (table.button + 1) % numPlayers;
  while (!players[button]) button = (button + 1) % numPlayers;

  let smBlind = (button + 1) % numPlayers;
  while (!players[smBlind]) smBlind = (smBlind + 1) % numPlayers;

  let bigBlind = (smBlind + 1) % numPlayers;
  while (!players[bigBlind]) bigBlind = (bigBlind + 1) % numPlayers;

  if (button === bigBlind) { // implies only 2 players. swap
    bigBlind = smBlind;
    smBlind = button;
  }

  // post blinds
  const bb = players[bigBlind]
  const sb = players[smBlind]
  bb.bet(Math.min(bb.stack.value, 2 * blinds));
  sb.bet(Math.min(sb.stack.value, blinds));
  table.pot = bb.curBets.add(sb.curBets);
  table.toMatch = Math.max(bb.curBets, sb.curBets);

  // generate hands
  players.forEach((player, i) => {
    if (player) {
      hands[i] = deck.draw(2);
      player.isinHand = true;
    }
  })
}

const street = (table) => {
  const {phaseid, deck} = table.deck;

  if (phaseid == 2) { // flop
    table.board = deck.draw(3);
  } else { // turn/river
    table.board.push(deck.draw()[0]);
  }
}

const showdown = (room, io) => {
  const table = room.table;
  const hands = room.hands;
  const inHand = table.getinHand();

  if (inHand.length === 1) {
    inHand[0].topup(table.pot.value);
    table.pot = currency(0);
    return;
  }

  const result = table.calculateHandOutcome(hands);
  const ranking = Array.from(result.entries());

  io.to(room.id).emit('showdown', hands);

  let i = 0;
  while (table.pot.value) { // uses fact that total pot === sum of player bets
    let winners = ranking[i][1];
    while (winners.length) {
      // assuming more than 1 player in this hand strength,
      // get player with lowest money in pot.
      // (doesnt matter if only one player since this will
      // just calculate their max possible winnings then
      // move to next tier if there is still money in the pot)
      const minPlayer = winners.reduce((prev, curr) =>
        table.players[prev].bets.value < table.players[curr].bets.value ? prev : curr);
      const minAmt = table.players[minPlayer].bets.value;

      // collect at most minPlayer bet amount from each player in the pot.
      const pot = table.players.reduce((acc, player) => {
        if (player && player.bets.value) {
          const amount = Math.min(minAmt, player.bets.value);
          player.bets = player.bets.subtract(amount);
          acc = acc.add(amount);
        }
        return acc;
      }, currency(0));

      // distribute this pot to all players in this hand strength.
      const dist = pot.distribute(winners.length);
      dist.forEach((cur, i) => table.players[winners[i]].curBets.add(cur.value));

      // remove player(s) that have received their max possible winnings
      winners = winners.filter(seat => table.players[seat].bets.value);

      // subtract this pot from table pot.
      table.pot = table.pot.subtract(pot);
    }
    i++;
  }
}

const posthand = (table) => {
  table.players.forEach(player => {
    if (player) {
      if (!player.stack.value) {
        player.isinSeat = false;
      } else {
        player.isinHand = false;
        player.bets = currency(0);
        player.curBets = currency(0);
      }

      if (!player.isinSeat) {
        table.kick(player);
      }
    }
  });

  table.board = [];
  if (table.curPlayers < 2) table.isOngoing = false;
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
const betRound = async (io, roomID, table) => {
  const {players, hands, maxPlayers: numPlayers} = table;

  let i = (table.button + 1) % numPlayers;
  let offset = table.phaseid === 1 ? 3 : 1; // find utg if preflop else sb
  while (offset) {
    while (!players[i]) (i + 1) % numPlayers;
    offset--;
  }
  let player = players[i];
  while (!table.resolveBets()) {
    // skip players not in hand or zero stack;
    while (!player || !player.isinHand || !player.stack.value) {
      i = (i + 1) % numPlayers;
      player = players[i];
    }

    table.turn = player.seat;
    io.to(roomID).emit('table', table);

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
        let callAmt = Math.min(player.stack.value, 
          table.toMatch - player.curBets.value);

        player.bet(callAmt);
        table.curPot = table.curPot.add(callAmt);
        break;

      default: // raise
        let amount = Number(action);

        if (isNaN(amount)) { // invalid input -> fold
          player.isinHand = false;
          player.bets = player.bets.add(player.curBets);
          hands[player.seat] = undefined;
        } else {
          let callAmt = table.toMatch - player.curBets.value;

          // ensure amount is within minRaise and player stack
          amount = Math.max(callAmt + table.minRaise,
            Math.min(amount, player.stack.value));

          player.bet(amount);
          table.curPot = table.curPot.add(amount);

          table.minRaise = player.curBets.subtract(table.toMatch).value;
          table.toMatch = player.curBets.value;
        }
    }

    io.emit('table', table);
    i = (i + 1) % numPlayers;
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

  table.pot = table.pot.add(table.curPot);
  table.curPot = currency(0);
}

const runHand = (room, io) => {
  const {roomID, table} = room;
  let flop, turn, river;
  flop = turn = river = street;
  const phases = [prehand, preflop, flop, turn, river, showdown, posthand];

  const runPhase = async () => {
    let phaseid = table.phaseid
    phases[phaseid](table);
    io.to(roomID).emit('table', JSON.stringify(table, (key, val) => {
      if (key === 'deck' || key === 'hands') return undefined;
    }));

    if (phaseid === 1) { // preflop, emit each hand
      const {players, hands} = table;
      players.forEach((player, i) => {
        if (player) io.to(player.sid).emit('hand', hands[i]);
      })
    }

    if (phaseid >= 1 && phaseid <= 4) {
      await betRound(io, roomID, table);

      // if only one player left after betting, skip to showdown.
      if (table.getinHand().length === 1) {
        table.phaseid = 4; // river, will increment to showdown
      }
    }

    if (table.phaseid || table.getinSeat().length >= 2 && table.isOngoing) {
      table.phaseid = (phaseid + 1) % phases.length;
      setTimeout(() => {
        runPhase();
      }, phaseid === 5 ? 3000 : 1000);
    } else {
      table.isOngoing = false;
    }
  }

  runPhase();
}

export default runHand;