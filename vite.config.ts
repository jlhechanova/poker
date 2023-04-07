import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

import { myServer } from './server';

const webSocketServer = {
	name: 'webSocketServer',
	configureServer(server) {
		myServer(server);
	}
}

export default defineConfig({
	plugins: [sveltekit(), webSocketServer]
});
