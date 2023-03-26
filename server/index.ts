import type { ViteDevServer } from 'vite';
import { Server } from 'socket.io';

import PokerTable from '../src/lib/consts/pokertable';
import type Card from '../src/lib/consts/card';
import { Socket } from 'socket.io-client';

const mod = (n: number, m: number) => ((n % m) + m) % m;

const table = new PokerTable();
let hands: Card[][] = [];

export const webSocketServer = {
  name: 'webSocketServer',
  configureServer(server: ViteDevServer) {
    const io = new Server(server.httpServer!);

    const runPhase = (phaseid: number) => {
      switch(phaseid) {
        case 0: // init
          table.reset();
          hands = [];
          io.emit('table', table);
          io.emit('hand', [])
          break;
        
        case 1: // preflop
          table.playersSeated().forEach(player => {
            hands.push(Array.from({length: 2}, _ => table.deal()));
            io.to(player.sid).emit('hand', hands.at(-1));
          });

          break;
        
        case 2: // flop
          table.board = Array.from({length: 3}, _ => table.deal());
          io.emit('table', table);
          break;
  
        case 3: // turn
          table.board.push(table.deal());
          io.emit('table', table);
          break;
  
        case 4: // river
          table.board.push(table.deal());
          io.emit('table', table);
          break;
  
        case 5: // showdown
          io.emit("showdown", "HELL YEAH");
          break;
      }
    }

    const runHand = () => {
      setTimeout(() => {
        runPhase(table.phase);

        if (table.phase || table.playersSeated().length >= 2) {
          setTimeout(() => runHand(), table.phase === 5 ? 2000 : 1000);
          table.nextPhase();
        } else {
          table.isOngoing = false;
        }
      });
    }

    io.on('connection', (socket) => {
      socket.on('reset', _ => {
        table.reset();
        io.emit('table', table);
        io.emit('hand', []);
      })
      
      socket.on('disconnect', () => {
        table.playerKick(socket.id);        
        console.log(`Player ${socket.id} has disconnected`);
      });

      socket.emit('seat', table.playersSeated().length);
      table.playerJoin(socket.id);
      socket.emit("table", table);
      console.log(table.players);
      

      if (table.playersSeated().length == 2 && !table.isOngoing) {
        table.isOngoing = true;
        runHand();
      }
    });
  },
}