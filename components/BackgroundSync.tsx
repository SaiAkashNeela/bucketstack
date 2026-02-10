import React, { useEffect, useState, useRef } from 'react';
import { SyncJob, S3Account } from '../types';
import { s3Service } from '../services/s3Service';

interface BackgroundSyncProps {
    accounts: S3Account[];
}

const SYNC_JOBS_KEY = 'bucketstack_sync_jobs';

export const BackgroundSync: React.FC<BackgroundSyncProps> = ({ accounts }) => {
    const [runningJobId, setRunningJobId] = useState<string | null>(null);
    const accountsRef = useRef(accounts);
    const runningJobIdRef = useRef<string | null>(null);

    // Sync refs with props/state
    useEffect(() => {
        accountsRef.current = accounts;
    }, [accounts]);

    useEffect(() => {
        runningJobIdRef.current = runningJobId;
    }, [runningJobId]);

    // Initial cleanup: Reset jobs that were stuck in 'running' state
    useEffect(() => {
        const saved = localStorage.getItem(SYNC_JOBS_KEY);
        if (!saved) return;
        try {
            const jobs: SyncJob[] = JSON.parse(saved);
            const stuckJobs = jobs.filter(j => j.status === 'running');
            if (stuckJobs.length > 0) {

                const fixedJobs = jobs.map(j => j.status === 'running' ? {
                    ...j,
                    status: 'error',
                    lastStats: { files_scanned: 0, files_transferred: 0, bytes_transferred: 0, errors: ['Job interrupted (app closed?)'] }
                } as SyncJob : j);
                localStorage.setItem(SYNC_JOBS_KEY, JSON.stringify(fixedJobs));
                window.dispatchEvent(new Event('storage'));
            }
        } catch (e) {
            console.error('Failed to cleanup sync jobs:', e);
        }
    }, []);

    useEffect(() => {

        const interval = setInterval(async () => {
            if (runningJobIdRef.current) return;

            const saved = localStorage.getItem(SYNC_JOBS_KEY);
            if (!saved) return;

            try {
                const jobs: SyncJob[] = JSON.parse(saved);
                const now = Date.now();

                // Find a job that is due, correctly handling missing accounts
                const jobToRun = jobs.find(j => {
                    const isDue = j.intervalSeconds &&
                        j.intervalSeconds > 0 &&
                        j.nextRun &&
                        j.nextRun <= now &&
                        j.status !== 'running';

                    if (!isDue) return false;

                    // Verify account exists before picking this job
                    const hasAccount = accountsRef.current.some(a => a.id === j.accountId);
                    if (!hasAccount) {
                        console.warn(`Sync job ${j.id} skipped: Account ${j.accountId} not found.`);
                        return false;
                    }
                    return true;
                });

                if (jobToRun) {
                    const account = accountsRef.current.find(a => a.id === jobToRun.accountId)!;


                    setRunningJobId(jobToRun.id);

                    // 1. Update status to running and notify UI
                    const updatedJobs = jobs.map(j => j.id === jobToRun.id ? { ...j, status: 'running' } as SyncJob : j);
                    localStorage.setItem(SYNC_JOBS_KEY, JSON.stringify(updatedJobs));
                    window.dispatchEvent(new Event('storage'));

                    try {
                        const stats = await s3Service.syncFolder(
                            account,
                            jobToRun.bucket,
                            jobToRun.localPath,
                            jobToRun.remotePath,
                            jobToRun.direction,
                            jobToRun.mirrorSync || false
                        );

                        // 2. Fetch latest jobs again as they might have changed
                        const currentJobsStr = localStorage.getItem(SYNC_JOBS_KEY);
                        const currentJobs: SyncJob[] = currentJobsStr ? JSON.parse(currentJobsStr) : updatedJobs;

                        const finishedJobs = currentJobs.map(j => j.id === jobToRun.id ? {
                            ...j,
                            status: 'completed',
                            lastRun: Date.now(),
                            lastStats: stats,
                            nextRun: j.intervalSeconds && j.intervalSeconds > 0 ? Date.now() + j.intervalSeconds * 1000 : undefined
                        } as SyncJob : j);

                        localStorage.setItem(SYNC_JOBS_KEY, JSON.stringify(finishedJobs));

                    } catch (error: any) {
                        console.error(`❌ Background sync failed for ${jobToRun.name}:`, error);
                        const currentJobsStr = localStorage.getItem(SYNC_JOBS_KEY);
                        const currentJobs: SyncJob[] = currentJobsStr ? JSON.parse(currentJobsStr) : updatedJobs;

                        const errorJobs = currentJobs.map(j => j.id === jobToRun.id ? {
                            ...j,
                            status: 'error',
                            lastStats: { files_scanned: 0, files_transferred: 0, bytes_transferred: 0, errors: [error.message] },
                            nextRun: j.intervalSeconds && j.intervalSeconds > 0 ? Date.now() + 300 * 1000 : undefined // Retry in 5m
                        } as SyncJob : j);

                        localStorage.setItem(SYNC_JOBS_KEY, JSON.stringify(errorJobs));
                    } finally {
                        setRunningJobId(null);
                        window.dispatchEvent(new Event('storage'));
                    }
                }
            } catch (e) {
                console.error('Background sync process error:', e);
            }
        }, 10000); // Check every 10 seconds

        return () => {

            clearInterval(interval);
        };
    }, []); // Empty dependency array - relies on refs for latest data

    return null;
};
