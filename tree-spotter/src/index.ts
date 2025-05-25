import { ImageProcessor } from './image-processor';
import type { Env, TwilioMessage, ProcessingJob } from './types';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Handle Twilio webhooks
		if (url.pathname === '/sms' && request.method === 'POST') {
			const formData = await request.formData();
			const formEntries = Object.fromEntries(formData.entries());
			const message: TwilioMessage = {
				MessageSid: String(formEntries.MessageSid || ''),
				From: String(formEntries.From || ''),
				NumMedia: String(formEntries.NumMedia || '0'),
				MediaUrl0: formEntries.MediaUrl0?.toString(),
				MediaContentType0: formEntries.MediaContentType0?.toString(),
			};

			if (message.NumMedia === '0') {
				return new Response(
					'<?xml version="1.0" encoding="UTF-8"?><Response><Message>Please send an image of the downed tree.</Message></Response>',
					{
						headers: { 'Content-Type': 'text/xml' }
					}
				);
			}

			// Store message metadata
			await env.METADATA.put(message.MessageSid, JSON.stringify({
				from: message.From,
				timestamp: new Date().toISOString(),
				status: 'received'
			}));

			if (message.MediaUrl0 && message.MediaContentType0?.startsWith('image/')) {
				// Download and store the image
				const imageResponse = await fetch(message.MediaUrl0);
				const imageBlob = await imageResponse.blob();

				await env.TREE_IMAGES.put(message.MessageSid, imageBlob, {
					customMetadata: {
						phoneNumber: message.From,
						contentType: message.MediaContentType0
					}
				});

				// Process the image immediately if no queue is available
				if (!env.IMAGE_PROCESSING_QUEUE) {
					ctx.waitUntil((async () => {
						try {
							const processor = new ImageProcessor(env);
							const result = await processor.processImage(message.MessageSid);

							// Store the results
							await env.METADATA.put(`${message.MessageSid}_results`, JSON.stringify(result));
						} catch (error) {
							console.error('Image processing failed:', error);
						}
					})());
				} else {
					// Queue the image for processing if queue is available
					await env.IMAGE_PROCESSING_QUEUE.send({
						messageId: message.MessageSid,
						imageUrl: message.MediaUrl0
					} satisfies ProcessingJob);
				}

				return new Response(
					'<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thank you for your submission! We will process your tree report.</Message></Response>',
					{
						headers: { 'Content-Type': 'text/xml' }
					}
				);
			}

			return new Response(
				'<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, we only accept image files.</Message></Response>',
				{
					headers: { 'Content-Type': 'text/xml' }
				}
			);
		}

		// Health check endpoint
		if (url.pathname === '/health') {
			return new Response('OK', { status: 200 });
		}

		return new Response('Not Found', { status: 404 });
	}
};
