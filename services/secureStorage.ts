import { invoke } from '@tauri-apps/api/core';

export const secureStorage = {
    /**
     * Securely saves a key-value pair using the backend's machine-bound encryption.
     * @param key The key to store
     * @param value The sensitive value to encrypt and store
     */
    saveItem: async (key: string, value: string): Promise<void> => {
        try {
            await invoke('save_secure_item', { key, value });
        } catch (error) {
            console.error(`Failed to save secure item ${key}:`, error);
            throw error;
        }
    },

    /**
     * Retrieves a decrypted value for the given key.
     * @param key The key to retrieve
     * @returns The decrypted value, or null if not found
     */
    getItem: async (key: string): Promise<string | null> => {
        try {
            return await invoke('get_secure_item', { key });
        } catch (error) {
            console.error(`Failed to get secure item ${key}:`, error);
            return null;
        }
    },

    /**
     * Removes a key-value pair from secure storage.
     * @param key The key to remove
     */
    removeItem: async (key: string): Promise<void> => {
        try {
            await invoke('delete_secure_item', { key });
        } catch (error) {
            console.error(`Failed to remove secure item ${key}:`, error);
            throw error;
        }
    }
};
