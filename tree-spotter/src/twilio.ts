import { createHmac, timingSafeEqual } from 'crypto';

export function validateTwilioRequest(
    url: string,
    params: Record<string, string>,
    twilioSignature: string,
    authToken: string,
): boolean {
    // Create the string to sign by concatenating URL with sorted parameters
    let dataToSign = url;
    const sortedKeys = Object.keys(params).sort();

    for (const key of sortedKeys) {
        dataToSign += key + params[key];
    }

    // Create HMAC-SHA1 hash
    const hmac = createHmac('sha1', authToken);
    hmac.update(dataToSign);
    const expectedSignature = hmac.digest('base64');

    // Compare signatures using constant-time comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature);
    const actualBuffer = Buffer.from(twilioSignature);
    if (expectedBuffer.length !== actualBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, actualBuffer);
}