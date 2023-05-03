import { Server } from 'socket.io';
import runPoker from './conn.js';

export const myServer = (server) => {
  const io = new Server(server.httpServer);
  runPoker(io);
}
