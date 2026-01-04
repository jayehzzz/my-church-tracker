import { supabase } from '../supabase.js';

export const BUCKET_NAME = 'service-photos';

/**
 * Upload a file to Supabase Storage
 * @param {File} file - The file object to upload
 * @param {string} path - The path/filename in the bucket (optional, defaults to timestamp-filename)
 * @returns {Promise<{ path: string, url: string, error: object }>}
 */
export async function uploadImage(file, path = null) {
    if (!path) {
        const timestamp = new Date().getTime();
        // Sanitize filename
        const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        path = `${timestamp}_${filename}`;
    }

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file);

    if (error) {
        console.error('Error uploading image:', error);
        return { error };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

    return { path: data.path, url: publicUrl };
}

/**
 * Delete a file from Supabase Storage
 * @param {string} path - The path of the file to delete
 */
export async function deleteImage(path) {
    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path]);

    return { error };
}
