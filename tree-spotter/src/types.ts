export interface Env {
    TWILIO_AUTH_TOKEN: string;
    TWILIO_ACCOUNT_SID: string;
}

export interface SendGridMessage {
    from: string;
    subject: string;
    images: SendGridImageAttachment[];
}

export interface SendGridAttachmentInfo {
    filename: string;
    type: string;
    disposition: string;
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
