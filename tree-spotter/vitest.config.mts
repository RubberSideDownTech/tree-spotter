import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		env: {
			TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN
		}
	},
});
