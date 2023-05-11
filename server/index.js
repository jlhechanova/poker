import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import conn from './conn.js';

import { handler } from '../build/handler.js'

const app = express()
const server = createServer(app)

const io = new Server(server)

conn(io);

// SvelteKit should handle everything else using Express middleware
// https://github.com/sveltejs/kit/tree/master/packages/adapter-node#custom-server
app.use(handler)

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Running on port ${PORT}`));
