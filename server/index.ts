import type { ViteDevServer } from 'vite';
import { Server } from 'socket.io';

import type Player from '../src/lib/consts/player';
import type Card from '../src/lib/consts/card';
import PokerTable from '../src/lib/consts/pokertable';
import Deck from '../src/lib/consts/deck';
import { mod } from '../src/lib/utils';

const table = new PokerTable();
const deck = new Deck();
let hands: Card[][] = [];

export const webSocketServer = {
  name: 'webSocketServer',
  configureServer(server: ViteDevServer) {

    const io = new Server(server.httpServer!);

    // TODO - UPDATE BIG BLINDS EVERY HAND
    const runPhase = async () => {
      if (table.phase === 'init') {
        io.emit('hand', []);
        hands = [];
        table.clear();
        io.emit('table', table);
        deck.deck();
      } 
      else if (table.phase === 'showdown') {
        // evaluate hands
        io.emit('showdown', hands);
      }
      else if (table.phase === 'posthand') {
        // reward pot/s, change bb
        table.players.forEach(player => {
          if (player) {
            player.isinHand = false;
          }
        });
        io.emit('table', table);
      }
      else { // main streets
        if (table.phase === 'preflop') {
          // get seated players and set them to be in the hand
          let players = table.players.reduce((players, player) => {
            if (player?.isinSeat) {
              player.isinHand = true;
              player.toAct = true;
              player.totalBets = 0;
              player.currBets = 0;
              players.push(player);
            }
            return players;
          }, [] as Player[]);

          let i = players.findIndex(player => player === table.bigBlind);

          table.toMatch = 1;
          players[i % players.length].bet(1);
          players[(i + 1) % players.length].bet(0.5);

          // deal hands
          table.players.forEach(player => {
            if (player) {
              let hand = Array.from({length: 2}, _ => deck.deal());
              hands.push(hand);
              io.to(player.sid).emit('hand', hand);
            }
          });
        } else {
          if (table.phase === 'flop') {
            table.board = Array.from({length: 3}, _ => deck.deal());
          }
          else { // turn/river
            table.board.push(deck.deal());
          }
          table.toMatch = 0;
        }
        io.emit('table', table);

        // if one inPlay but many inHand, all in; skip betting
        if (table.getinPlay().length === 1 && table.getinHand().length > 1) {
          return;
        }

        // BETTING PHASE
        table.minRaise = 1;

        // find first to play, starting from left of big blind
        // 1. find player in main players array
        let utg = mod(table.bigBlind.seat - 1, table.players.length);
        while (!table.players[utg] || table.players[utg].stack === 0) {
          utg = mod(utg - 1, table.players.length);
        }
        
        // 2. find index of player in inPlay array
        let players = table.getinPlay();
        let i = players.findIndex(player => player === table.players[utg]);
        
        // betting open until one player left or bets are resolved
        while (players.length > 1 && !table.resolveBets()) {
          let player = players[i];
          player.toAct = false;
          let action = 'check';

          try {
            const res = await io
              .to(player.sid)
              .timeout(10000)
              .emitWithAck('action');
            if (res.length) action = res[0];
          } catch (err) { // client disconnect?
            action = 'check';
          }
          console.log(action);          

          // if playerbet is not equal to toMatch amount, change 
          // action to fold. avoids making special case for BB
          if (action === 'check' && player.currBets !== table.toMatch) {
            action = 'fold';
          }

          if (action === 'fold') {
            player.isinHand = false;
            hands[player.seat] = Array.from({length: 2});

            // if player folds, update players array.
            // dont change index if in middle due to array shift
            players = table.getinPlay();
            if (i === 0 || i === players.length) {
              i = mod(i - 1, players.length);
            }
          } else {
            if (action === 'check') {
              player.bet(0);
            } else if (action === 'call') {
              player.bet(Math.min(table.toMatch - player.currBets, player.stack));
            } else {
              let raise = Number(action);
              
              player.bet(raise);
              table.minRaise = player.currBets - table.toMatch;
              table.toMatch = player.currBets;
            }

            i = mod(i - 1, players.length);
          }

          table.kickPlayers();
          io.emit('table', table);
        }

        // lock bets, also set players'
        // toAct = true for next phase
        players.forEach(player => {
          if (player) {
            player.totalBets += player.currBets;
            player.currBets = 0;
            player.toAct = true;
          }
        });

        // if one player left in hand after betting, skip to posthand
        if (table.getinHand().length === 1 && table.getinHand().length === 1) {
          table.phaseid = 5;
        }
      }
    }

    const runHand = async () => {
      await runPhase();

      if (table.phaseid || table.getinSeat().length >= 2) {
        setTimeout(() => {
          table.nextPhase();
          runHand();
        }, table.phase === 'posthand' ? 2000 : 1000);
      } else {
        table.isOngoing = false;
      }
    }

    io.on('connection', (socket) => {
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

      socket.on('leave', _ => {
        table.playerLeave(socket.id);
        io.emit('table', table);
      });
      
      socket.on('disconnect', () => {
        table.playerLeave(socket.id);
        console.log(`${socket.id} has disconnected`);
        io.emit('table', table);
      });
    });
  }
}