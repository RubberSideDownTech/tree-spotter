import { TreeImage, GpsCoordinate } from './types';
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

interface GpsResolutionError {
  type: 'gps_extraction';
  imageName: string;
  message: string;
}

interface DiameterCalculationError {
  type: 'diameter_calculation';
  imageName: string;
  message: string;
}

// Union type for all possible image processing errors
type ImageProcessingError =
  | GpsResolutionError
  | DiameterCalculationError;


function extractGpsFromImage(contents: Buffer, name: string): Result<GpsCoordinate, GpsResolutionError> {
  try {
    // Parse EXIF data from the image buffer
    const tags = ExifReader.load(contents);

    // Check if GPS data exists
    if (!tags.GPSLatitude || !tags.GPSLongitude) {
      return failure({
        type: 'gps_extraction',
        imageName: name,
        message: 'No GPS coordinates found in image EXIF data'
      });
    }

    // Extract latitude
    let latitude: number;
    if (typeof tags.GPSLatitude.description === 'number') {
      latitude = tags.GPSLatitude.description;
    } else if (typeof tags.GPSLatitude.description === 'string') {
      latitude = parseFloat(tags.GPSLatitude.description);
    } else {
      return failure({
        type: 'gps_extraction',
        imageName: name,
        message: 'Invalid GPS latitude format in EXIF data'
      });
    }

    // Extract longitude
    let longitude: number;
    if (typeof tags.GPSLongitude.description === 'number') {
      longitude = tags.GPSLongitude.description;
    } else if (typeof tags.GPSLongitude.description === 'string') {
      longitude = parseFloat(tags.GPSLongitude.description);
    } else {
      return failure({
        type: 'gps_extraction',
        imageName: name,
        message: 'Invalid GPS longitude format in EXIF data'
      });
    }

    // Handle GPS direction references (N/S for latitude, E/W for longitude)
    if (tags.GPSLatitudeRef && (tags.GPSLatitudeRef.description === 'S' || tags.GPSLatitudeRef.description === 'South latitude')) {
      latitude = -latitude;
    }

    if (tags.GPSLongitudeRef && (tags.GPSLongitudeRef.description === 'W' || tags.GPSLongitudeRef.description === 'West longitude')) {
      longitude = -longitude;
    }

    // Validate coordinates are within valid ranges
    if (latitude < -90 || latitude > 90) {
      return failure({
        type: 'gps_extraction',
        imageName: name,
        message: `Invalid latitude value: ${latitude}. Must be between -90 and 90.`
      });
    }

    if (longitude < -180 || longitude > 180) {
      return failure({
        type: 'gps_extraction',
        imageName: name,
        message: `Invalid longitude value: ${longitude}. Must be between -180 and 180.`
      });
    }

    console.log(`Extracted GPS coordinates from image: ${name} - Latitude: ${latitude}, Longitude: ${longitude}`);
    return success({
      latitude,
      longitude
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return failure({
      type: 'gps_extraction',
      imageName: name,
      message: `Failed to parse EXIF data: ${errorMessage}`
    });
  }
}

function calculateDiameter(contents: Buffer, name: string): Promise<Result<number, DiameterCalculationError>> {
  // TODO: Implement diameter calculation logic
  return new Promise((resolve) => {
    // Simulate asynchronous operation
    setTimeout(() => {
      // For now, just return a dummy value
      resolve(success(30)); // Dummy diameter value
    }, 1000);
  });
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
  GpsResolutionError,
  DiameterCalculationError,
  ImageProcessingError,
};

export {
  extractGpsFromImage,
  calculateDiameter,
};
