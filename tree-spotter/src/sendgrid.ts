import { ImageProcessingError, extractGpsFromImage, calculateDiameter } from "./imageProcessing";
import { SendGridImageAttachment, SendGridAttachmentInfo, SendGridMessage, Tree, TreeImage } from "./types";
import { groupImagesIntoTrees } from "./treeGrouping";

export function attachmentsFrom(count: number, formData: FormData): SendGridImageAttachment[] {
    const attachments: SendGridImageAttachment[] = [];

    for (let i = 1; i <= count; i++) {
        const attachmentInfo = formData.get(`attachment-info${i}`) as string;
        const attachmentData = formData.get(`attachment${i}`) as File;

        if (attachmentInfo && attachmentData) {
            const info: SendGridAttachmentInfo = JSON.parse(attachmentInfo);

            // Check if it's an image
            if (info.type && info.type.startsWith('image/')) {
                attachments.push({
                    filename: info.filename,
                    type: info.type,
                    size: attachmentData.size,
                    data: attachmentData
                });

                console.log(`Image attachment found: ${info.filename}, type: ${info.type}`);
            }
        }
    }

    return attachments;
}

export async function processToTrees(message: SendGridMessage): Promise<{ trees: Tree[], errors: ImageProcessingError[] }> {
    const errors: ImageProcessingError[] = [];
    const processedImages: TreeImage[] = [];

    // Process each image attachment
    for (const attachment of message.images) {
        try {
            // Convert File to Buffer
            const arrayBuffer = await attachment.data.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Extract GPS coordinates
            const gpsResult = extractGpsFromImage(buffer, attachment.filename);
            if (!gpsResult.success) {
                errors.push(gpsResult.error);
                continue;
            }

            // Calculate diameter
            const diameterResult = await calculateDiameter(buffer, attachment.filename);
            if (!diameterResult.success) {
                errors.push(diameterResult.error);
                continue;
            }

            // Create TreeImage
            const treeImage: TreeImage = {
                contents: buffer,
                contentType: attachment.type,
                gps: gpsResult.data,
                diameter: diameterResult.data
            };

            processedImages.push(treeImage);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push({
                type: 'gps_extraction',
                imageName: attachment.filename,
                message: `Failed to process attachment: ${errorMessage}`
            });
        }
    }

    // Group images into trees based on GPS proximity
    const trees: Tree[] = groupImagesIntoTrees(processedImages);

    return { trees, errors };
}
