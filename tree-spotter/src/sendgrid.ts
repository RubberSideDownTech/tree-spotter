import { ImageProcessingError, extractGpsFromImage, calculateDiameter } from "./imageProcessing";
import { SendGridImageAttachment, SendGridAttachmentInfo, SendGridMessage, Tree, TreeImage } from "./types";
import { groupImagesIntoTrees } from "./treeGrouping";

export function attachmentsFrom(count: number, formData: FormData): SendGridImageAttachment[] {
    const attachments: SendGridImageAttachment[] = [];

    // Get the attachment-info which contains metadata for all attachments
    const attachmentInfoRaw = formData.get('attachment-info') as string;
    console.log('Raw attachment-info:', attachmentInfoRaw);

    if (!attachmentInfoRaw) {
        console.log('No attachment-info found in form data');
        return attachments;
    }

    let attachmentInfoMap: Record<string, SendGridAttachmentInfo>;
    try {
        attachmentInfoMap = JSON.parse(attachmentInfoRaw);
        console.log('Parsed attachment-info:', attachmentInfoMap);
    } catch (error) {
        console.error('Failed to parse attachment-info JSON:', error);
        return attachments;
    }

    // Process each attachment based on the info map
    for (const [attachmentKey, info] of Object.entries(attachmentInfoMap)) {
        console.log(`Processing attachment key: ${attachmentKey}`, info);

        // Get the actual attachment data using the key
        const attachmentData = formData.get(attachmentKey) as File;

        if (!attachmentData) {
            console.log(`No attachment data found for key: ${attachmentKey}`);
            continue;
        }

        console.log(`Found attachment data for ${attachmentKey}:`, {
            name: attachmentData.name,
            size: attachmentData.size,
            type: attachmentData.type
        });

        // Check if it's an image
        if (info.type && info.type.startsWith('image/')) {
            attachments.push({
                filename: info.filename,
                type: info.type,
                size: attachmentData.size,
                data: attachmentData
            });

            console.log(`Image attachment added: ${info.filename}, type: ${info.type}, size: ${attachmentData.size}`);
        } else {
            console.log(`Skipping non-image attachment: ${info.filename}, type: ${info.type}`);
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
            console.log(`gpsResult: ${JSON.stringify(gpsResult)}`);
            if (!gpsResult.success) {
                errors.push(gpsResult.error);
                continue;
            }

            // Calculate diameter
            const diameterResult = await calculateDiameter(buffer, attachment.filename);
            console.log(`diameterResult: ${JSON.stringify(diameterResult)}`);
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
