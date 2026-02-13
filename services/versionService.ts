interface VersionInfo {
  currentVersion: string;
  latestVersion: string | null;
  isUpdateAvailable: boolean;
  downloadUrl?: string;
}

function compareVersions(current: string, latest: string): number {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const cp = currentParts[i] || 0;
    const lp = latestParts[i] || 0;

    if (cp < lp) return -1;
    if (cp > lp) return 1;
  }

  return 0;
}

export const versionService = {
  getCurrentVersion(): string {
    return '1.0.1';
  },

  async getLatestVersion(): Promise<VersionInfo> {
    try {
      const response = await fetch(
        'https://github.com/SaiAkashNeela/bucketstack/releases/latest/download/latest.json',
        { cache: 'no-store' }
      );

      if (!response.ok) {
        console.warn('Failed to fetch latest version');
        return {
          currentVersion: this.getCurrentVersion(),
          latestVersion: null,
          isUpdateAvailable: false,
        };
      }

      const manifest = await response.json();
      const latestVersion = manifest.version;
      const currentVersion = this.getCurrentVersion();

      return {
        currentVersion,
        latestVersion,
        isUpdateAvailable: compareVersions(currentVersion, latestVersion) < 0,
        downloadUrl: `https://github.com/SaiAkashNeela/bucketstack/releases/tag/v${latestVersion}`,
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return {
        currentVersion: this.getCurrentVersion(),
        latestVersion: null,
        isUpdateAvailable: false,
      };
    }
  },

  async openDownloadPage(): Promise<void> {
    const versionInfo = await this.getLatestVersion();
    if (versionInfo.downloadUrl) {
      window.open(versionInfo.downloadUrl, '_blank');
    }
  },
};
