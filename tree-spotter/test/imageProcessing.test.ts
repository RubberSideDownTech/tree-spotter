import { describe, it, expect } from 'vitest';
import { extractGpsFromImage } from '../src/imageProcessing';
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