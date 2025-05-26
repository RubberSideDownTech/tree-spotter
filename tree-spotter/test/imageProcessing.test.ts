import { describe, it, expect } from 'vitest';
import { extractGpsFromImage } from '../src/imageProcessing';

describe('extractGpsFromImage', () => {
  it('should return failure when buffer has no EXIF data', () => {
    // Create a simple buffer without EXIF data
    const emptyBuffer = Buffer.from([]);
    const result = extractGpsFromImage(emptyBuffer, 'test-url');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('gps_extraction');
      expect(result.error.imageUrl).toBe('test-url');
      expect(result.error.message).toContain('Failed to parse EXIF data');
    }
  });

  it('should return failure when buffer has invalid EXIF data', () => {
    // Create a buffer with invalid data
    const invalidBuffer = Buffer.from('invalid image data');
    const result = extractGpsFromImage(invalidBuffer, 'test-url');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('gps_extraction');
      expect(result.error.imageUrl).toBe('test-url');
      expect(result.error.message).toContain('Failed to parse EXIF data');
    }
  });

  it('should handle buffer parsing errors gracefully', () => {
    // Test with a buffer that might cause parsing errors
    const corruptBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // Partial JPEG header
    const result = extractGpsFromImage(corruptBuffer, 'test-url');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('gps_extraction');
      expect(result.error.imageUrl).toBe('test-url');
    }
  });
});