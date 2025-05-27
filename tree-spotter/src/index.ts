import type { Env } from './types';
import { attachmentsFrom, processToTrees } from './sendgrid';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    console.log(`[${new Date().toISOString()}] Incoming request to ${url.pathname}`);


    if (url.pathname === '/email' && request.method === 'POST') {
      const formData = await request.formData();
      const from = formData.get('from') as string;
      const subject = formData.get('subject') as string;

      console.log(`Email received from: ${from}, subject: ${subject}`);

      const attachmentCount = parseInt(formData.get('attachments') as string) || 0;

      if (attachmentCount === 0) {
        // TODO: send response indicating no attachments
        return new Response('OK', { status: 200 });
      }

      const message = {
        from,
        subject,
        images: attachmentsFrom(attachmentCount, formData)
      };

      // Process form entries through the pipeline
      const { trees, errors } = await processToTrees(message);

      // Log results for debugging
      console.log(`Processed ${trees.length} trees successfully`);
      if (errors.length > 0) {
        console.warn(`${errors.length} image processing errors:`, errors);
      }

      // Submit trees to API (stubbed)
      try {
        // const apiResult = await submitTreesToApi(trees, env);
        // console.log(`API submission result: ${apiResult.submittedCount} trees submitted`);

        // Send email response with results (stubbed)
        // const emailResult = await sendProcessingResultsEmail(
        //   from,
        //   trees,
        //   errors,
        //   apiResult.errors,
        //   env
        // );

        // if (emailResult.success) {
        //   console.log(`Email response sent successfully`);
        // } else {
        //   console.error(`Failed to send email response:`, emailResult.error);
        // }

      } catch (error) {
        console.error(`API or email processing failed:`, error);
        // TODO: Send error notification email
      }

      return new Response('OK', { status: 200 });
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
