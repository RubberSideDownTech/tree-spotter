export interface Env {
    SENDGRID_API_KEY: string;
    AI: Ai;
}

export interface SendGridMessage {
    from: string;
    subject: string;
    images: SendGridImageAttachment[];
    body: string;
}

export interface SendGridAttachmentInfo {
    filename: string;
    name: string;
    type: string;
    'content-id'?: string;
}

export interface SendGridImageAttachment {
    filename: string;
    type: string;
    size: number;
    data: File;
}

export interface SendGridImageLoadError {
    filename: string;
    message: string;
}

export interface GpsResolutionError {
    message: string;
}

export interface DiameterCalculationError {
    message: string;
}

export interface TreeImage {
    contents: Buffer;
    contentType: string;
    gps: GpsCoordinate;
    diameter: number;
}

export interface GpsCoordinate {
    latitude: number;
    longitude: number;
}

export interface Tree {
    images: TreeImage[];
}
