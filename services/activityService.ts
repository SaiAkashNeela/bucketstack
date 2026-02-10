import { invoke } from '@tauri-apps/api/core';
import { ActivityLogEntry, ActivityLogFilters, S3Account } from '../types';

export const activityService = {
    /**
     * Log an activity entry
     * This is called after each operation completes
     */
    logActivity: async (
        account: S3Account,
        actionType: string,
        objectPathBefore?: string,
        objectPathAfter?: string,
        status: 'success' | 'failed' = 'success',
        errorMessage?: string,
        fileSize?: number
    ): Promise<void> => {
        // Only log if activity logging is enabled for this account
        if (!account.enableActivityLog) {
            return;
        }

        try {
            await invoke('log_activity_entry', {
                connectionId: account.id,
                provider: account.provider,
                bucketName: account.bucketName,
                actionType,
                objectPathBefore,
                objectPathAfter,
                status,
                errorMessage,
                fileSize,
                enableActivityLog: account.enableActivityLog,
            });
        } catch (error) {
            // Logging should never block or crash the app
            console.warn('Failed to log activity:', error);
        }
    },

    /**
     * Query activity log with filters
     */
    queryLog: async (
        filters: ActivityLogFilters,
        limit: number = 100,
        offset: number = 0
    ): Promise<ActivityLogEntry[]> => {
        return await invoke<ActivityLogEntry[]>('query_activity_log', {
            filters,
            limit,
            offset,
        });
    },

    /**
     * Export activity log to CSV or JSON
     */
    exportLog: async (
        format: 'csv' | 'json',
        filters?: ActivityLogFilters
    ): Promise<string> => {
        return await invoke<string>('export_activity_log', {
            format,
            filters: filters || null,
        });
    },

    /**
     * Clear activity log
     */
    clearLog: async (
        connectionId?: string,
        beforeDate?: string
    ): Promise<boolean> => {
        return await invoke<boolean>('clear_activity_log', {
            connectionId: connectionId || null,
            beforeDate: beforeDate || null,
        });
    },
};
