import * as ExifReader from 'exifreader';
import { type Env } from './types';

export class ImageProcessor {
    constructor(private env: Env) { }

    async processImage(messageId: string): Promise<{
        latitude?: number;
        longitude?: number;
        estimatedDiameter?: number;
    }> {
        // Get the image from R2
        const imageObject = await this.env.TREE_IMAGES.get(messageId);
        if (!imageObject) {
            throw new Error('Image not found');
        }

        const imageArrayBuffer = await imageObject.arrayBuffer();

        // Extract GPS coordinates from EXIF data
        const tags = await ExifReader.load(imageArrayBuffer);

        let latitude: number | undefined;
        let longitude: number | undefined;

        if (tags.GPSLatitude && tags.GPSLongitude) {
            latitude = this.convertGPSToDecimal(tags.GPSLatitude.description, tags.GPSLatitudeRef?.value?.[0]);
            longitude = this.convertGPSToDecimal(tags.GPSLongitude.description, tags.GPSLongitudeRef?.value?.[0]);
        }

        // TODO: Implement tree diameter estimation using TensorFlow.js
        // For now, we'll return placeholder data
        const estimatedDiameter = undefined;

        return {
            latitude,
            longitude,
            estimatedDiameter
        };
    }

    private convertGPSToDecimal(gpsValue: string, ref?: string): number {
        const [degrees, minutes, seconds] = gpsValue.split(',').map(parseFloat);
        let decimal = degrees + (minutes / 60) + (seconds / 3600);

        // If ref is 'S' or 'W', negate the value
        if (ref === 'S' || ref === 'W') {
            decimal = -decimal;
        }

        return decimal;
    }
}
