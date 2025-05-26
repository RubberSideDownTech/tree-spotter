import { TwilioMessage, TwilioImage, TreeImage, GpsCoordinate } from './types';
import ExifReader from 'exifreader';

// Result types for ROP
type Result<T, E> = Success<T> | Failure<E>;
type Success<T> = { success: true; data: T };
type Failure<E> = { success: false; error: E };

// Collection result for handling multiple operations
type CollectionResult<T, E> = {
  successes: T[];
  failures: E[];
};

// Enhanced error types with image context
interface TwilioImageLoadError {
  type: 'image_load';
  imageUrl: string;
  message: string;
}

interface GpsResolutionError {
  type: 'gps_extraction';
  imageUrl: string;
  message: string;
}

interface DiameterCalculationError {
  type: 'diameter_calculation';
  imageUrl: string;
  message: string;
}

// Union type for all possible image processing errors
type ImageProcessingError =
  | TwilioImageLoadError
  | GpsResolutionError
  | DiameterCalculationError;

// Core pipeline functions
async function loadImageContents(image: TwilioImage): Promise<Result<Buffer, TwilioImageLoadError>> {
  const fetchWithTimeout = async (url: string, timeoutMs: number = 1000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'tree-spotter/1.0'
        }
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  const validateImageContent = (buffer: Buffer, expectedContentType: string): boolean => {
    // Check basic image signatures
    const imageSignatures: Record<string, number[]> = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header for WebP
      'image/bmp': [0x42, 0x4D],
      'image/tiff': [0x49, 0x49, 0x2A, 0x00], // Little endian TIFF
    };

    const signature = imageSignatures[expectedContentType.toLowerCase()];
    if (!signature) return true; // Unknown type, assume valid

    // Check if buffer starts with expected signature
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) return false;
    }
    return true;
  };

  const attemptFetch = async (attempt: number): Promise<Result<Buffer, TwilioImageLoadError>> => {
    try {
      const response = await fetchWithTimeout(image.url);

      if (!response.ok) {
        return failure({
          type: 'image_load',
          imageUrl: image.url,
          message: `HTTP ${response.status}: ${response.statusText}`
        });
      }

      // Verify content type matches
      const actualContentType = response.headers.get('content-type') || '';
      if (!actualContentType.startsWith('image/')) {
        return failure({
          type: 'image_load',
          imageUrl: image.url,
          message: `Invalid content type: expected image, got ${actualContentType}`
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Validate image content
      if (!validateImageContent(buffer, image.contentType)) {
        return failure({
          type: 'image_load',
          imageUrl: image.url,
          message: `Content does not match expected type ${image.contentType}`
        });
      }

      return success(buffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (attempt === 1) {
        // Retry once
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay before retry
        return attemptFetch(2);
      }

      return failure({
        type: 'image_load',
        imageUrl: image.url,
        message: `Failed after 2 attempts: ${errorMessage}`
      });
    }
  };

  return attemptFetch(1);
}

function extractGpsFromImage(contents: Buffer, url: string): Result<GpsCoordinate, GpsResolutionError> {
  try {
    // Parse EXIF data from the image buffer
    const tags = ExifReader.load(contents);

    // Check if GPS data exists
    if (!tags.GPSLatitude || !tags.GPSLongitude) {
      return failure({
        type: 'gps_extraction',
        imageUrl: url,
        message: 'No GPS coordinates found in image EXIF data'
      });
    }

    // Extract latitude
    let latitude: number;
    if (typeof tags.GPSLatitude.description === 'string') {
      latitude = parseFloat(tags.GPSLatitude.description);
    } else {
      return failure({
        type: 'gps_extraction',
        imageUrl: url,
        message: 'Invalid GPS latitude format in EXIF data'
      });
    }

    // Extract longitude
    let longitude: number;
    if (typeof tags.GPSLongitude.description === 'string') {
      longitude = parseFloat(tags.GPSLongitude.description);
    } else {
      return failure({
        type: 'gps_extraction',
        imageUrl: url,
        message: 'Invalid GPS longitude format in EXIF data'
      });
    }

    // Handle GPS direction references (N/S for latitude, E/W for longitude)
    if (tags.GPSLatitudeRef && tags.GPSLatitudeRef.description === 'S') {
      latitude = -latitude;
    }

    if (tags.GPSLongitudeRef && tags.GPSLongitudeRef.description === 'W') {
      longitude = -longitude;
    }

    // Validate coordinates are within valid ranges
    if (latitude < -90 || latitude > 90) {
      return failure({
        type: 'gps_extraction',
        imageUrl: url,
        message: `Invalid latitude value: ${latitude}. Must be between -90 and 90.`
      });
    }

    if (longitude < -180 || longitude > 180) {
      return failure({
        type: 'gps_extraction',
        imageUrl: url,
        message: `Invalid longitude value: ${longitude}. Must be between -180 and 180.`
      });
    }

    return success({
      latitude,
      longitude
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return failure({
      type: 'gps_extraction',
      imageUrl: url,
      message: `Failed to parse EXIF data: ${errorMessage}`
    });
  }
}

function calculateDiameter(contents: Buffer, url: string): Promise<Result<number, DiameterCalculationError>> {
  throw new Error("Not implemented");
}

// Single image processing pipeline
function processImage(image: TwilioImage): Promise<Result<TreeImage, ImageProcessingError>> {
  throw new Error("Not implemented");
}

// Parallel processing orchestrator
function processImagesInParallel(images: TwilioImage[]): Promise<CollectionResult<TreeImage, ImageProcessingError>> {
  throw new Error("Not implemented");
}

// Main transformation function
function transformTwilioMessageToTree(message: TwilioMessage): Promise<CollectionResult<TreeImage, ImageProcessingError>> {
  throw new Error("Not implemented");
}

// Helper functions for Result type
function success<T>(data: T): Success<T> {
  return { success: true, data };
}

function failure<E>(error: E): Failure<E> {
  return { success: false, error };
}

// Export everything
export type {
  Result,
  Success,
  Failure,
  CollectionResult,
  TwilioImageLoadError,
  GpsResolutionError,
  DiameterCalculationError,
  ImageProcessingError,
};

export {
  loadImageContents,
  extractGpsFromImage,
  calculateDiameter,
  processImage,
  processImagesInParallel,
  transformTwilioMessageToTree,
  success,
  failure
};