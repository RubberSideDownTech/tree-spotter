export interface Env {
    TREE_IMAGES: R2Bucket;
    METADATA: KVNamespace;
    IMAGE_PROCESSING_QUEUE?: Queue;
    TWILIO_AUTH_TOKEN: string;
    TWILIO_ACCOUNT_SID: string;
}

export interface TwilioMessage {
    MessageSid: string;
    From: string;
    NumMedia: string;
    MediaUrl0?: string;
    MediaContentType0?: string;
}

export interface ProcessingJob {
    messageId: string;
    imageUrl: string;
}
