/**
 * Storage Service - Convex Backend
 * 
 * NOTE: Convex handles file storage differently than Supabase.
 * For file uploads with Convex, you'll need to use Convex's file storage APIs.
 * See: https://docs.convex.dev/file-storage
 * 
 * This is a placeholder that returns errors until file storage is configured.
 */

export const BUCKET_NAME = 'service-photos';

/**
 * Upload a file to storage
 * @param {File} file - The file object to upload
 * @param {string} path - The path/filename in the bucket
 * @returns {Promise<{ path: string, url: string, error: object }>}
 */
export async function uploadImage(file, path = null) {
    // TODO: Implement Convex file storage
    // See: https://docs.convex.dev/file-storage
    console.warn('File storage not yet configured for Convex. Please implement Convex file storage.');
    return {
        error: new Error('File storage not yet configured. Please implement Convex file storage.'),
        path: null,
        url: null
    };
}

/**
 * Delete a file from storage
 * @param {string} path - The path of the file to delete
 */
export async function deleteImage(path) {
    // TODO: Implement Convex file storage deletion
    console.warn('File storage not yet configured for Convex.');
    return {
        error: new Error('File storage not yet configured.')
    };
}
