export interface Env {
    TREE_IMAGES: R2Bucket;
    METADATA: KVNamespace;
    IMAGE_PROCESSING_QUEUE?: Queue;
    TWILIO_AUTH_TOKEN: string;
    TWILIO_ACCOUNT_SID: string;
}
