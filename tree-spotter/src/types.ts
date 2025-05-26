export interface Env {
    TWILIO_AUTH_TOKEN: string;
    TWILIO_ACCOUNT_SID: string;
}

export interface TwilioMessage {
    from: string;
    images: TwilioImage[];
}

export interface TwilioImage {
    url: string;
    contentType: string;
    contents: Promise<Buffer>
}

export interface TwilioImageLoadError {
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
