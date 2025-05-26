import type { Env } from './types';
// import { validateTwilioRequest } from './twilio';

export default {
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		console.log(`[${new Date().toISOString()}] Incoming request to ${url.pathname}`);


		if (url.pathname === '/sms' && request.method === 'POST') {
			const formData = await request.formData();
			const formEntries: Record<string, string> = Object.fromEntries(
				Array.from(formData.entries()).map(([k, v]) => [k, typeof v === 'string' ? v : String(v)])
			);

			// const isValid = validateTwilioRequest(
			// 	url.toString(),
			// 	formEntries,
			// 	request.headers.get('X-Twilio-Signature') || '',
			// 	env.TWILIO_AUTH_TOKEN,
			// );

			// if (!isValid) {
			// 	console.warn('Invalid Twilio signature received');
			// 	return new Response('Unauthorized', { status: 401 });
			// }

			return new Response(
				'<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thank you for your submission! We will process your tree report.</Message></Response>',
				{
					headers: { 'Content-Type': 'text/xml' }
				}
			);
		}

		// Health check endpoint
		if (url.pathname === '/health') {
			console.log('Health check request received');
			return new Response('OK', { status: 200 });
		}

		console.warn(`Not found: ${url.pathname}`);
		return new Response('Not Found', { status: 404 });
	}
};
