import Room from './classes/room.js';
import { v4 } from 'uuid';

const rooms = new Map();

const conn = (io) => {
  io.on('connection', (socket) => {
    console.log(`${socket.id} has connected`);
    socket.username = socket.handshake.auth.username ?? 'Guest';
    socket.isinSeat = false;
    socket.roomID = null;
    socket.seat = null;

    socket.on('getTable', (roomID, fn) => {
      const room = rooms.get(roomID);
      if (!room) {
        fn(false);
        return;
      }

      fn(room.table);
      if (room.host.sid === socket.id) socket.emit('host');
    })

    socket.on('getRooms', fn => {
      fn([...rooms.values()]);
    })

    socket.on('createRoom', (arg, fn) => {
      const name = arg.name;
      if (!name) {
        fn(false);
        return;
      }

      const roomID = v4();
      const host = {sid: socket.id, name: socket.username};
      const room = new Room(io, host, roomID, ...Object.values(arg));
      rooms.set(roomID, room);

      socket.roomID = roomID;
      socket.join(roomID);
      fn(roomID);
    })

    socket.on('joinRoom', async (roomID, pass, fn) => {
      const room = rooms.get(roomID);
      if (!room || !room.auth(pass)) {
        fn(false);
        return;
      }

      socket.roomID = roomID;
      socket.join(roomID);
      fn(true);
    })

    socket.on('leaveRoom', async () => {
      const roomID = socket.roomID;
      if (!roomID) return;

      socket.leave(roomID);
      socket.roomID = null;

      const room = rooms.get(roomID);
      if (!room) return;

      const sockets = await io.in(roomID).fetchSockets();
      if (!sockets.length) {
        rooms.delete(roomID);
        return;
      }

      if (room.host.sid === socket.id) {
        const newHost = sockets[0];
        room.host = {sid: newHost.id, name: newHost.username};
        socket.to(newHost.id).emit('host');
      }
    })

    socket.on('joinTable', (seat, fn) => {
      const {id, roomID, username, seat: oldSeat} = socket;
      const room = rooms.get(roomID);
      const table = room.table;

      const res = table.playerJoin(id, username, seat, oldSeat);
      if (!res) {
        fn(false);
        return;
      }

      socket.isinSeat = true;
      socket.seat = seat;

      // need to inform client of success before emitting table state
      fn(true);
      io.to(roomID).emit('tableState', {
        players: table.players,
        curPlayers: table.curPlayers,
      });
    })

    socket.on('leaveTable', seat => {
      const roomID = socket.roomID;
      const room = rooms.get(roomID);
      const table = room.table;

      table.playerLeave(seat);
      socket.isinSeat = false;
      socket.seat = null;
    })

    socket.on('start', () => {
      const roomID = socket.roomID;
      const table = rooms.get(roomID)?.table;
      if (table && table.isPaused) {
        if (!table.isOngoing) {
          table.isOngoing = setTimeout(() => {
            table.isOngoing = null;
            if (table.curPlayers > 1) table.run();
          }, table.turn !== null || table.phase === 0 ? 0 : 1000);
        }
        table.isPaused = false;
        io.to(roomID).emit('tableState', {isPaused: false});
      }
    })

    socket.on('pause', () => {
      const roomID = socket.roomID;
      const table = rooms.get(roomID)?.table;
      if (table && !table.isPaused) {
        if (table.isOngoing) {
          clearTimeout(table.isOngoing);
          table.isOngoing = null;
        }
        table.isPaused = true;
        io.to(roomID).emit('tableState', {isPaused: true});
      }
    })

    socket.on('editPlayer', data => {
      const name = data.name;
      const {roomID, seat} = socket;
      if (!name || !roomID || seat === null) return;

      const room = rooms.get(roomID);
      if (!room) return;

      const table = room.table;
      const players = table.players;
      const player = players[seat];
      if (!player) return;
      
      players[seat].name = data.name.replace(/[^a-zA-Z0-9 -]/,'');
      io.to(roomID).emit('tableState', {players: players});
      socket.username = name;
    })

    socket.on('disconnect', async () => {
      console.log(`${socket.id} has disconnected`);
      const roomID = socket.roomID;
      if (!roomID) return;

      const room = rooms.get(roomID);
      if (room) {
        const sockets = await io.to(roomID).fetchSockets();
        if (!sockets.length) {
          rooms.delete(roomID);
          return;
        }

        const newHost = sockets[0];
        room.host = {sid: newHost.id, name: newHost.username}

        if (socket.isinSeat) {
          room.table.playerLeave(socket.seat);
        }
      }
    })
  })
}

export default conn;
