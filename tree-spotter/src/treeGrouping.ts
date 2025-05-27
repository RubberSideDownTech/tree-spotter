import { TreeImage, Tree, GpsCoordinate } from './types';

/**
 * Groups tree images into trees based on GPS proximity and timing
 */
export function groupImagesIntoTrees(images: TreeImage[]): Tree[] {
    // For now, create a simple grouping algorithm
    // In the future, this could be more sophisticated

    if (images.length === 0) {
        return [];
    }

    // TODO: Implement clustering algorithm based on:
    // 1. GPS coordinates (proximity threshold)
    // 2. Image timestamps (if available)
    // 3. Image characteristics

    // For now, group images that are within 10 meters of each other
    const trees: Tree[] = [];
    const processedImages = new Set<TreeImage>();

    for (const image of images) {
        if (processedImages.has(image)) {
            continue;
        }

        const nearbyImages = [image];
        processedImages.add(image);

        // Find other images within proximity threshold
        for (const otherImage of images) {
            if (processedImages.has(otherImage)) {
                continue;
            }
            const distance = calculateGpsDistance(image.gps, otherImage.gps);
            if (distance <= 3) { // 3 meters threshold
                nearbyImages.push(otherImage);
                processedImages.add(otherImage);
            }
        }

        trees.push({
            images: nearbyImages
        });
    }

    return trees;
}

/**
 * Calculates the distance between two GPS coordinates in meters
 */
export function calculateGpsDistance(coord1: GpsCoordinate, coord2: GpsCoordinate): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = coord1.latitude * Math.PI / 180;
    const lat2Rad = coord2.latitude * Math.PI / 180;
    const deltaLatRad = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const deltaLngRad = (coord2.longitude - coord1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
