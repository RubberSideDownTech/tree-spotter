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

async function calculateDiameter(
  subject: string,
  body: string,
  env: { AI: any }
): Promise<Result<number, DiameterCalculationError>> {
  try {
    // Create a prompt to extract diameter information from email content
    const prompt = `
You are analyzing an email about tree measurements. Extract the diameter measurement for trees mentioned in the email.

Email Subject: ${subject}
Email Body: ${body}

Please extract the diameter measurement in centimeters. Look for:
- Explicit diameter measurements (e.g., "30cm diameter", "diameter: 25cm")
- DBH (Diameter at Breast Height) measurements
- Circumference measurements that can be converted to diameter
- Any numerical values followed by units that could indicate tree diameter

If you find a circumference measurement, convert it to diameter using the formula: diameter = circumference / π

Return only the numeric value in centimeters as a number. If no diameter information is found, return "NOT_FOUND".

Examples:
- "Tree diameter is 30cm" → 30
- "DBH: 25 centimeters" → 25
- "Circumference 94.2cm" → 30
- "No measurements provided" → NOT_FOUND
`;

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt: prompt,
    });

    console.log(`AI response for diameter extraction:`, response);

    // Parse the AI response
    let responseText: string;
    if (typeof response === 'string') {
      responseText = response;
    } else if (response && typeof response === 'object' && 'response' in response) {
      responseText = response.response;
    } else {
      return failure({
        type: 'diameter_calculation',
        message: 'Unexpected AI response format'
      });
    }

    responseText = responseText.trim();

    if (responseText === 'NOT_FOUND') {
      return failure({
        type: 'diameter_calculation',
        message: 'No diameter measurement found in email content'
      });
    }

    // Try to parse the numeric value
    const diameterValue = parseFloat(responseText);

    if (isNaN(diameterValue) || diameterValue <= 0) {
      return failure({
        type: 'diameter_calculation',
        message: `Invalid diameter value extracted: "${responseText}"`
      });
    }

    // Validate reasonable diameter range (1cm to 1000cm)
    if (diameterValue < 1 || diameterValue > 1000) {
      return failure({
        type: 'diameter_calculation',
        message: `Diameter value ${diameterValue}cm is outside reasonable range (1-1000cm)`
      });
    }

    console.log(`Successfully extracted diameter from email: ${diameterValue}cm`);
    return success(diameterValue);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return failure({
      type: 'diameter_calculation',
      message: `Failed to calculate diameter using AI: ${errorMessage}`
    });
  }
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
