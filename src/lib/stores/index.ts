import { writable } from 'svelte/store';
import { io } from 'socket.io-client';

export const socket = writable(io());

export const lobby = writable('');

export const actionTimeout = writable<NodeJS.Timeout | null>(null);
export const actionInterval = writable<NodeJS.Timeout>();