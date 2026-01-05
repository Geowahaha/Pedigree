import { supabase } from './supabase';

/**
 * Uploads a file to Supabase Storage in the 'pet-photos' bucket.
 * Returns the public URL of the uploaded file.
 */
export async function uploadPetImage(file: File): Promise<string> {
    try {
        // 1. Generate a unique file path
        // Format: {timestamp}-{random}-{clean_filename}
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const filePath = `${fileName}`;

        // 2. Upload to Supabase
        const { data, error: uploadError } = await supabase.storage
            .from('pet-photos')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            throw uploadError;
        }

        // 3. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('pet-photos')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

/**
 * Uploads a user avatar to Supabase Storage.
 */
export async function uploadUserAvatar(file: File): Promise<string> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('user-avatars')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('user-avatars')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading avatar:', error);
        throw error;
    }
}


/**
 * Helper to Convert Blob/URL to File object if needed
 */
export async function urlToFile(url: string, filename: string, mimeType: string): Promise<File> {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    return new File([buf], filename, { type: mimeType });
}

/**
 * Uploads a document (PDF/Image) to 'pet-documents' bucket.
 */
export async function uploadPetDocument(file: File): Promise<string> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('pet-documents')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('pet-documents')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading document:', error);
        throw error;
    }
}
