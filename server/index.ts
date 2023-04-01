import type { ViteDevServer } from 'vite';
import { Server } from 'socket.io';

import type Player from '../src/lib/consts/player';
import type Card from '../src/lib/consts/card';
import PokerTable from '../src/lib/consts/pokertable';
import Deck from '../src/lib/consts/deck';
import { mod } from '../src/lib/utils';
import currency from 'currency.js';

const table = new PokerTable();
const deck = new Deck();
let hands: (Card[] | undefined)[] = [];

export const webSocketServer = {
  name: 'webSocketServer',
  configureServer(server: ViteDevServer) {

    const io = new Server(server.httpServer!);

    const runPhase = async () => {
      switch (table.phase) {
        case 'init':
          io.emit('hand', []);
          hands = [];
          table.clear();
          io.emit('table', table);
          deck.deck();
          break;

        case 'showdown':
          let result = table.evaluate(hands); // list of list of seats acc to hand strength
          let eligible = table.getinHand().length;

          if (eligible > 1) {
            io.emit('showdown', hands);
          }

          let k = 0;
          while (table.pot.value) {
            while (result[k].length) {
              // distribute pot to players in this hand strength
              let dist = table.pot.distribute(result[k].length);

              if (dist.every((cur, i) => 
                table.players[result[k][i]].totalbet * eligible >= cur.value))
              {
                dist.forEach((cur, i) => table.players[result[k][i]].topup(cur.value))
                table.pot = currency(0);
                break;
              }

              // SIDE POTS
              // get player with lowest money in the pot
              let min = result[k].reduce((prev, cur) =>
                table.players[cur].totalbet < table.players[prev].totalbet ? cur : prev);
              let minPlayer = table.players[min];
              let minBet = currency(minPlayer.totalbet);

              // award max possible amount to players.
              // reduce bet of players in the pot by
              // the lowest player bet
              result[k].forEach(seat => {
                let player = table.players[seat]
                player.topup(minBet.multiply(eligible).value);
                player.totalbet = -minBet.subtract(player.totalbet).value;
              });
              table.pot = table.pot.subtract(minBet.value * eligible * result[k].length);

              // remove min player(s) from the pot
              result[k] = result[k].filter(seat => {
                if (table.players[seat].totalbet) {
                  return true;
                }
                eligible--;
              })
            }
            k++;
          }

          break;

        case 'posthand':
          table.players.forEach(player => {
            if (player) {
              player.isinHand = false;

              if (!player.stack || !player.isinSeat) {
                player.isinSeat = false;
                table.kick(player);
                io.to(player.sid).emit('out');
              }
            }
          });
          io.emit('table', table);
          break;

        default: // main streets
          if (table.phase === 'preflop') {
            // get seated, non-broke players and set them in the hand
            let players = table.players.reduce((players, player) => {
              if (player?.isinSeat && player.stack) {
                player.isinHand = true;
                player.toAct = true;
                player.totalbet = 0;
                player.bets = 0;
                players.push(player);
              }
              return players;
            }, [] as Player[]);
  
            let bbidx = players.findIndex(player => player === table.bigBlind);
            table.bigBlind = players[mod(bbidx + 1, players.length)];
            players[mod(bbidx + 1, players.length)].bet(1);
            players[mod(bbidx + 2, players.length)].bet(0.5);
            table.pot = table.pot.add(1.5);
  
            // deal hands
            table.players.forEach(player => {
              if (player) {
                let hand = Array.from({length: 2}, () => deck.deal());
                io.to(player.sid).emit('hand', hand);
                hands.push(hand);
              } else {
                hands.push(undefined);
              }
            });
          } else if (table.phase === 'flop') {
            table.board = Array.from({length: 3}, () => deck.deal());
          } else { // turn/river
            table.board.push(deck.deal());
          }
          table.toMatch = table.phase === 'preflop' ? 1 : 0;
          table.minRaise = 1;
          io.emit('table', table); // CHANGE TO A BOARD EVENT ? 
          
          // if at most one in play but many in hand, all ins; skip betting
          if (table.getinPlay().length <= 1 &&
            table.getinHand().length > 1) {
            return;
          }
  
          /*  BETTING PHASE
           *
           *  betting round is very straightforward:
           *  1. find utg
           *  2. starting from utg, player actions until betting round ends.
           * 
           *  the betting round ends in three ways:
           *  1. only 1 player left in the hand
           *    (no one else to contest, everyone else has folded)
           *  2. at most 1 player left with a stack
           *    (implies multiple people in the hand, which implies
           *     everyone has gone all in since they do not have a stack
           *     or only one player does)
           *  3. all non-allin bets are equal to the highest bet
           *    (players have a flag (toAct) for if the player has made
           *     an action. highest bet = 0 implies all players bet 0 (check).
           *     if highest bet > 0, implies that betting has been opened
           *     and all players have matched any highest bet/gone allin.)
           *  
           *  checks are handled by the PokerTable.resolveBets() method.
           */

          // utg is to the left of bb
          let i = mod(table.bigBlind.seat - 1, table.players.length);
          while (!table.resolveBets()) {  
            // skip players not in hand or zero stack
            while (!table.players[i] || 
              !table.players[i].isinHand || 
              !table.players[i].stack)
            {
              i = mod(i - 1, table.players.length);
            }

            let player = table.players[i] as Player;
  
            let action = 'check';
            player.toAct = false;
  
            // get action from user
            try {
              const res = await io
                .to(player.sid)
                .timeout(10000)
                .emitWithAck('action');
  
              if (res.length) action = res[0];
            } catch (err) { // client disconnect?
              action = 'check';
            }
  
            // default action is check; avoids special case for BB
            if (action === 'check' && player.bets !== table.toMatch) {
              action = 'fold';
            }
  
            switch (action) {
              case 'check':
                break;

              case 'fold':
                player.isinHand = false;
                hands[player.seat] = undefined;
                break;
              
              case 'call':
                let amount = Math.min(table.toMatch - player.bets, player.stack)
                player.bet(amount);
                table.pot = table.pot.add(amount);
                break;

              default:
                let bet = Number(action);
  
                if (isNaN(bet)) { // invalid input? fold
                  player.isinHand = false;
                  hands[player.seat] = undefined;
                } else {
                  bet = Math.max(bet,
                    table.toMatch - player.bets + table.minRaise);
                  let amount = Math.min(player.stack, bet);

                  player.bet(amount);
                  table.pot = table.pot.add(amount);

                  table.minRaise = player.bets - table.toMatch;
                  table.toMatch = player.bets;
                }
            }
            // TODO - rework after completing users
            if (!player.isinSeat && !player.isinHand) {
              table.kick(player);
            }
            io.emit('table', table);

            i = mod(i - 1, table.players.length);
          }
  
          // clear bets and set toAct = true for next phase
          table.players.forEach(player => {
            if (player) {
              player.bets = 0;
              player.toAct = true;
            }
          });

          // if one player left in hand after betting, skip to posthand
          if (table.getinHand().length === 1) {
            table.phaseid = 5;
            table.phase = 'showdown';
          }
      }
    }

    const runHand = async () => {
      await runPhase();

      if (table.phaseid || table.getinSeat().length >= 2) {
        setTimeout(() => {
          table.nextPhase();
          runHand();
        }, table.phase === 'showdown' ? 2000 : 1000);
      } else {
        table.isOngoing = false;
      }
    }

    io.on('connection', socket => {
      socket.emit('table', table);
      console.log(`${socket.id} has connected`);

      socket.on('join', seat => {
        if (!table.players[seat]) table.playerJoin(socket.id, seat);
        io.emit('table', table);

        if (table.getinSeat().length == 2 && !table.isOngoing) {
          table.isOngoing = true;
          runHand();
        }
      });

      socket.on('leave', seat => {
        table.playerLeave(seat);
        io.emit('table', table);
      });
      
      socket.on('disconnect', () => {
        table.playerDC(socket.id);
        console.log(`${socket.id} has disconnected`);
        io.emit('table', table);
      });
    });
  }
}