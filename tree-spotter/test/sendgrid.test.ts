import { describe, it, expect } from 'vitest';
import { attachmentsFrom } from '../src/sendgrid';

describe('attachmentsFrom', () => {
  it('should parse SendGrid attachment format correctly', () => {
    // Create a mock FormData that matches the SendGrid format from your example
    const formData = new FormData();
    
    // Add the attachment info as SendGrid sends it
    const attachmentInfo = {
      "attachment1": {
        "filename": "IMG_9883.jpeg",
        "name": "IMG_9883.jpeg",
        "type": "image/jpeg",
        "content-id": "ii_1970f53bd63d6fb7ef91"
      }
    };
    
    formData.append('attachment-info', JSON.stringify(attachmentInfo));
    formData.append('attachments', '1');
    
    // Create a mock file for the attachment
    const mockImageData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header
    const mockFile = new File([mockImageData], 'IMG_9883.jpeg', { type: 'image/jpeg' });
    formData.append('attachment1', mockFile);
    
    // Call the function
    const result = attachmentsFrom(1, formData);
    
    // Verify the result
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      filename: 'IMG_9883.jpeg',
      type: 'image/jpeg',
      size: mockImageData.length,
      data: mockFile
    });
  });

  it('should handle multiple attachments', () => {
    const formData = new FormData();
    
    const attachmentInfo = {
      "attachment1": {
        "filename": "IMG_9883.jpeg",
        "name": "IMG_9883.jpeg", 
        "type": "image/jpeg",
        "content-id": "ii_1970f53bd63d6fb7ef91"
      },
      "attachment2": {
        "filename": "IMG_9884.png",
        "name": "IMG_9884.png",
        "type": "image/png",
        "content-id": "ii_1970f53bd63d6fb7ef92"
      }
    };
    
    formData.append('attachment-info', JSON.stringify(attachmentInfo));
    formData.append('attachments', '2');
    
    const mockImageData1 = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header
    const mockFile1 = new File([mockImageData1], 'IMG_9883.jpeg', { type: 'image/jpeg' });
    formData.append('attachment1', mockFile1);
    
    const mockImageData2 = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG header
    const mockFile2 = new File([mockImageData2], 'IMG_9884.png', { type: 'image/png' });
    formData.append('attachment2', mockFile2);
    
    const result = attachmentsFrom(2, formData);
    
    expect(result).toHaveLength(2);
    expect(result[0].filename).toBe('IMG_9883.jpeg');
    expect(result[1].filename).toBe('IMG_9884.png');
  });

  it('should skip non-image attachments', () => {
    const formData = new FormData();
    
    const attachmentInfo = {
      "attachment1": {
        "filename": "document.pdf",
        "name": "document.pdf",
        "type": "application/pdf",
        "content-id": "ii_1970f53bd63d6fb7ef91"
      },
      "attachment2": {
        "filename": "IMG_9884.png",
        "name": "IMG_9884.png",
        "type": "image/png", 
        "content-id": "ii_1970f53bd63d6fb7ef92"
      }
    };
    
    formData.append('attachment-info', JSON.stringify(attachmentInfo));
    formData.append('attachments', '2');
    
    const mockPdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF header
    const mockPdfFile = new File([mockPdfData], 'document.pdf', { type: 'application/pdf' });
    formData.append('attachment1', mockPdfFile);
    
    const mockImageData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG header
    const mockImageFile = new File([mockImageData], 'IMG_9884.png', { type: 'image/png' });
    formData.append('attachment2', mockImageFile);
    
    const result = attachmentsFrom(2, formData);
    
    // Should only return the image attachment, not the PDF
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('IMG_9884.png');
    expect(result[0].type).toBe('image/png');
  });

  it('should handle missing attachment-info gracefully', () => {
    const formData = new FormData();
    formData.append('attachments', '1');
    
    const result = attachmentsFrom(1, formData);
    
    expect(result).toHaveLength(0);
  });

  it('should handle malformed attachment-info JSON gracefully', () => {
    const formData = new FormData();
    formData.append('attachment-info', 'invalid json{');
    formData.append('attachments', '1');
    
    const result = attachmentsFrom(1, formData);
    
    expect(result).toHaveLength(0);
  });

  it('should handle missing attachment data gracefully', () => {
    const formData = new FormData();
    
    const attachmentInfo = {
      "attachment1": {
        "filename": "IMG_9883.jpeg",
        "name": "IMG_9883.jpeg",
        "type": "image/jpeg",
        "content-id": "ii_1970f53bd63d6fb7ef91"
      }
    };
    
    formData.append('attachment-info', JSON.stringify(attachmentInfo));
    formData.append('attachments', '1');
    // Note: we're not appending the actual attachment1 data
    
    const result = attachmentsFrom(1, formData);
    
    expect(result).toHaveLength(0);
  });
});