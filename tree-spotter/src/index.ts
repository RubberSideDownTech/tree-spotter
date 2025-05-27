import type { Env } from './types';
import { attachmentsFrom, processToTrees } from './sendgrid';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    console.log(`[${new Date().toISOString()}] Incoming request to ${url.pathname}`);


    if (url.pathname === '/email' && request.method === 'POST') {
      const formData = await request.formData();

      // Debug: Log all form data keys to see what we're receiving
      const allFormKeys = Array.from(formData.keys());
      console.log('All form data keys:', allFormKeys);

      // Debug: Log form data entries (be careful with large binary data)
      const debugFormData: Record<string, any> = {};
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          debugFormData[key] = {
            type: 'File',
            name: value.name,
            size: value.size,
            contentType: value.type
          };
        } else {
          debugFormData[key] = value;
        }
      }
      console.log(`Form data (debug):`, debugFormData);

      const from = formData.get('from') as string;
      const subject = formData.get('subject') as string;

      console.log(`Email received from: ${from}, subject: ${subject}`);

      const attachmentCount = parseInt(formData.get('attachments') as string) || 0;

      console.log(`Number of attachments: ${attachmentCount}`);


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

      console.log(`Encountered ${errors.length} errors during processing`);

      // console.log each error
      errors.forEach(error => {
        console.log(`Image processing error for ${error.imageName}: ${error.message}`);
      });

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
