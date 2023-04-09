import { Server, Socket } from 'socket.io';
import Room from '../src/lib/consts/room';
import runHand from './hand';
import { v4 } from 'uuid';

interface ISocket extends Socket {
  username?: string,
  roomID?: string,
  isinSeat?: boolean
  seat?: number
}

export const myServer = (server) => {
  const io = new Server(server.httpServer);

  const rooms: Map<string, Room> = new Map();

  io.on('connection', (socket: ISocket) => {
    console.log(`${socket.id} has connected`);
    socket.username = 'Guest';
    socket.isinSeat = false;

    socket.on('getRoom', (roomID, fn) => {
      fn(rooms.get(roomID));
    })

    socket.on('getRooms', fn => {
      fn([...rooms.values()]);
    })

    socket.on('createRoom', (arg, fn) => {
      const name = arg.name;
      if (!name) fn(false);

      const host = {sid: socket.id, name: socket.username};
      const roomID = v4();
      const room = new Room(host, roomID, ...Object.values(arg));
      rooms.set(roomID, room);

      socket.roomID = roomID;
      socket.join(roomID);
      fn(roomID);
      console.log(`${socket.username} has joined room ${room.name}`);
    })

    socket.on('joinRoom', async (roomID, pass, fn) => {
      const room = rooms.get(roomID);
      if (!room || room.passcode !== pass) return fn(false);

      socket.roomID = roomID;
      socket.join(roomID);
      fn(true);
      
      console.log(`${socket.username} has joined room ${room.name}`);
    })

    socket.on('leaveRoom', async () => {
      const roomID = socket.roomID;
      if (!roomID) return;

      socket.leave(roomID);
      socket.roomID = undefined;
      
      const room = rooms.get(roomID);
      if (!room) return;

      console.log(`${socket.username} has left room ${room.name}`);

      const sockets = await io.in(roomID).fetchSockets();
      if (!sockets.length) {
        console.log(`${room.name} has been closed`);
        return rooms.delete(roomID);
      }

      if (room.host.sid === socket.id) {
        const newHost = sockets[0];
        room.host = {sid: newHost.id, name: newHost.username};
        socket.to(newHost.id).emit('host');
      }
    })

    socket.on('joinTable', (seat, fn) => {
      const room = rooms.get(socket.roomID);
      const table = room.table;

      table.playerJoin(socket.id, socket.username, seat);
      io.to(room.id).emit('table', table);
      socket.isinSeat = true;
      socket.seat = seat;
  
      fn(true);
    })
  
    socket.on('leaveTable', seat => {
      const room = rooms.get(socket.roomID);
      const table = room.table;

      table.playerLeave(seat);
      socket.isinSeat = false;
      io.to(room.id).emit('table', table);
    })

    socket.on('start', () => {
      const room = rooms.get(socket.roomID);
      const table = room.table;
      if (!table.isOngoing && !table.phaseid && table.getinSeat().length >= 2) {
        table.isOngoing = true;
        runHand(room, io);
      }
    })

    socket.on('pause', () => {
      const room = rooms.get(socket.roomID);
      const table = room.table;
      table.isOngoing = false;
    })

    socket.on('disconnect', async () => {
      const roomID = socket.roomID;
      if (!roomID) return;
      
      const room = rooms.get(roomID);
      if (room) {
        const sockets = await io.to(roomID).fetchSockets();
        if (!sockets.length) {
          console.log(`${room.name} has been closed`);
          rooms.delete(roomID);
          return;
        }

        const newHost = sockets[0];
        room.host = {sid: newHost.id, name: newHost.username}

        if (socket.isinSeat) {
          const table = room.table;
          table.playerLeave(socket.seat);
          io.to(roomID).emit('table', table);
        }
      }
    })
  })
}
//   const runHand = async () => {
//     await runPhase();

//     if (table.phaseid || table.getinSeat().length >= 2) {
//       setTimeout(() => {
//         table.nextPhase();
//         runHand();
//       }, table.phase === 'showdown' ? 2000 : 1000);
//     } else {
//       table.isOngoing = false;
//     }
//   }