import { describe, it, expect } from 'vitest';
import { extractGpsFromImage, calculateDiameter } from '../src/imageProcessing';
import * as fs from 'fs';
import * as path from 'path';
import { fail } from 'assert';

describe('extractGpsFromImage', () => {
  describe('Real image processing', () => {
    const getFixturePath = (filename: string): string => {
      return path.join(__dirname, 'fixtures', filename);
    };

    const loadImageFixture = (filename: string): Buffer => {
      const imagePath = getFixturePath(filename);
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Fixture image not found: ${imagePath}`);
      }
      return fs.readFileSync(imagePath);
    };

    it('should process an image with GPS coordinates from computer', () => {
      const imageBuffer = loadImageFixture('from-computer-with-gps.jpeg');
      expect(imageBuffer.length).toBeGreaterThan(0);

      const result = extractGpsFromImage(imageBuffer, 'test-fixtures/from-computer-with-gps.jpeg');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.latitude).toBeCloseTo(35.230447, 5);
        expect(result.data.longitude).toBeCloseTo(-82.736022, 5);
      } else {
        fail('Expected success but got failure: ' + result.error.message);
      }
    });

    it('should process an image without GPS coordinates', () => {
      const imageBuffer = loadImageFixture('no-gps-from-trailforks.jpg');
      expect(imageBuffer.length).toBeGreaterThan(0);

      const result = extractGpsFromImage(imageBuffer, 'test-fixtures/no-gps-from-trailforks.jpg');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('gps_extraction');
        expect(result.error.imageName).toBe('test-fixtures/no-gps-from-trailforks.jpg');
        expect(result.error.message).toMatch(/No GPS coordinates found|Failed to parse EXIF data/);
      }
    });
  });

  describe('Invalid inputs', () => {

    it('should return failure when buffer has no EXIF data', () => {
      // Create a simple buffer without EXIF data
      const emptyBuffer = Buffer.from([]);
      const result = extractGpsFromImage(emptyBuffer, 'test-name');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('gps_extraction');
        expect(result.error.imageName).toBe('test-name');
        expect(result.error.message).toContain('Failed to parse EXIF data');
      }
    });

    it('should return failure when buffer has invalid EXIF data', () => {
      // Create a buffer with invalid data
      const invalidBuffer = Buffer.from('invalid image data');
      const result = extractGpsFromImage(invalidBuffer, 'test-name');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('gps_extraction');
        expect(result.error.imageName).toBe('test-name');
        expect(result.error.message).toContain('Failed to parse EXIF data');
      }
    });

    it('should handle buffer parsing errors gracefully', () => {
      // Test with a buffer that might cause parsing errors
      const corruptBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // Partial JPEG header
      const result = extractGpsFromImage(corruptBuffer, 'test-url');

      expect(result.success).toBe(false);
    });
  });
});

describe('calculateDiameter', () => {
  // Mock AI environment for testing
  const mockEnv = {
    AI: {
      run: async (model: string, options: { prompt: string }) => {
        const prompt = options.prompt;
        
        // Extract email body from the prompt
        const bodyMatch = prompt.match(/Email Body: (.+?)(?:\n\nPlease extract|$)/s);
        const emailBody = bodyMatch ? bodyMatch[1].trim() : '';
        
        // Mock AI responses based on email body content
        if (emailBody.includes('Tree diameter is 30cm')) {
          return { response: '30' };
        } else if (emailBody.includes('DBH: 25 centimeters')) {
          return { response: '25' };
        } else if (emailBody.includes('Circumference 94.2cm')) {
          return { response: '30' }; // 94.2 / π ≈ 30
        } else if (emailBody.includes('No measurements provided')) {
          return { response: 'NOT_FOUND' };
        } else if (emailBody.includes('Invalid response')) {
          return { response: 'not a number' };
        } else {
          return { response: 'NOT_FOUND' };
        }
      }
    }
  };

  it('should extract explicit diameter measurements', async () => {
    const result = await calculateDiameter(
      'Tree measurement',
      'Tree diameter is 30cm',
      mockEnv
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(30);
    }
  });

  it('should extract DBH measurements', async () => {
    const result = await calculateDiameter(
      'Tree survey',
      'DBH: 25 centimeters',
      mockEnv
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(25);
    }
  });

  it('should convert circumference to diameter', async () => {
    const result = await calculateDiameter(
      'Tree measurements',
      'Circumference 94.2cm',
      mockEnv
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(30);
    }
  });

  it('should return error when no measurement found', async () => {
    const result = await calculateDiameter(
      'Random email',
      'No measurements provided',
      mockEnv
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('diameter_calculation');
      expect(result.error.message).toBe('No diameter measurement found in email content');
    }
  });

  it('should handle invalid AI responses', async () => {
    const result = await calculateDiameter(
      'Test email',
      'Invalid response',
      mockEnv
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('diameter_calculation');
      expect(result.error.message).toContain('Invalid diameter value extracted');
    }
  });

  it('should validate diameter range', async () => {
    const mockEnvWithLargeValue = {
      AI: {
        run: async () => ({ response: '2000' }) // Value outside valid range
      }
    };

    const result = await calculateDiameter(
      'Test',
      'Large tree',
      mockEnvWithLargeValue
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('outside reasonable range');
    }
  });

  it('should handle AI errors gracefully', async () => {
    const mockEnvWithError = {
      AI: {
        run: async () => {
          throw new Error('AI service unavailable');
        }
      }
    };

    const result = await calculateDiameter(
      'Test',
      'Test body',
      mockEnvWithError
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('diameter_calculation');
      expect(result.error.message).toContain('Failed to calculate diameter using AI');
    }
  });
});