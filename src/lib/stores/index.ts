import { writable } from 'svelte/store';
import { io } from 'socket.io-client';

export const socket = writable(io({autoConnect: false}));
export const lobby = writable('');