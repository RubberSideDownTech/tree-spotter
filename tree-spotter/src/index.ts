import type { Env, TwilioMessage, TwilioImage, Tree } from './types';
import { transformTwilioMessageToTree } from './imageProcessing';
import type { CollectionResult, ImageProcessingError } from './imageProcessing';
// import { validateTwilioRequest } from './twilio';

// Helper function to parse form entries into TwilioMessage
function parseFormEntriesToTwilioMessage(formEntries: Record<string, string>): TwilioMessage {
	const from = formEntries.From || '';
	const images: TwilioImage[] = [];

	// Parse media attachments from Twilio
	const numMedia = parseInt(formEntries.NumMedia || '0', 10);

	for (let i = 0; i < numMedia; i++) {
		const mediaUrl = formEntries[`MediaUrl${i}`];
		const mediaContentType = formEntries[`MediaContentType${i}`];

		if (mediaUrl && mediaContentType) {
			images.push({
				url: mediaUrl,
				contentType: mediaContentType,
				contents: Promise.resolve(Buffer.alloc(0)) // Placeholder - will be loaded in processing
			});
		}
	}

	return { from, images };
}

// Main pipeline function
async function processFormEntriesToTrees(formEntries: Record<string, string>): Promise<{
	trees: Tree[];
	errors: ImageProcessingError[];
}> {
	// Step 1: Parse form entries to TwilioMessage
	const twilioMessage = parseFormEntriesToTwilioMessage(formEntries);

	// Step 2: Transform TwilioMessage to Tree using our processing pipeline
	const processingResult = await transformTwilioMessageToTree(twilioMessage);

	// Step 3: Convert results to Trees
	const trees = processingResult.successes.length > 0
		? [{ images: processingResult.successes }]
		: [];

	return {
		trees,
		errors: processingResult.failures
	};
}

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

			try {
				// Process form entries through the pipeline
				const { trees, errors } = await processFormEntriesToTrees(formEntries);

				// Log results for debugging
				console.log(`Processed ${trees.length} trees successfully`);
				if (errors.length > 0) {
					console.warn(`${errors.length} image processing errors:`, errors);
				}

				// TODO: Store trees in database or send to next processing step

				// Determine response message based on results
				let responseMessage = 'Thank you for your submission!';
				if (trees.length > 0) {
					const totalImages = trees.reduce((sum, tree) => sum + tree.images.length, 0);
					responseMessage += ` We successfully processed ${totalImages} image(s) from ${trees.length} tree(s).`;
				}
				if (errors.length > 0) {
					responseMessage += ` However, ${errors.length} image(s) could not be processed.`;
				}

				return new Response(
					`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${responseMessage}</Message></Response>`,
					{
						headers: { 'Content-Type': 'text/xml' }
					}
				);
			} catch (error) {
				console.error('Pipeline processing error:', error);
				return new Response(
					'<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, there was an error processing your submission. Please try again.</Message></Response>',
					{
						headers: { 'Content-Type': 'text/xml' }
					}
				);
			}
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
