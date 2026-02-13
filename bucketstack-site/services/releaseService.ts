interface PlatformRelease {
  url: string;
  signature?: string;
}

interface ReleaseManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: {
    [key: string]: PlatformRelease;
  };
}

export const releaseService = {
  async getLatestRelease(): Promise<ReleaseManifest | null> {
    try {
      const response = await fetch(
        'https://github.com/SaiAkashNeela/bucketstack/releases/latest/download/latest.json',
        { cache: 'no-store' }
      );

      if (!response.ok) {
        console.error('Failed to fetch latest release:', response.status);
        return null;
      }

      const manifest: ReleaseManifest = await response.json();
      return manifest;
    } catch (error) {
      console.error('Error fetching latest release manifest:', error);
      return null;
    }
  },

  async getDownloadLinks() {
    const manifest = await this.getLatestRelease();

    if (!manifest) {
      return {
        version: null,
        macos: {
          arm64: 'https://github.com/SaiAkashNeela/bucketstack/releases/download/v0.0.1/BucketStack_0.0.1_aarch64.dmg',
          x64: 'https://github.com/SaiAkashNeela/bucketstack/releases/download/v0.0.1/BucketStack_0.0.1_x64.dmg',
        },
        windows: 'https://github.com/SaiAkashNeela/bucketstack/releases/download/v0.0.1/BucketStack_0.0.1_x64-setup.exe',
        linux: 'https://github.com/SaiAkashNeela/bucketstack/releases/tag/v0.0.1',
      };
    }

    return {
      version: manifest.version,
      macos: {
        arm64: manifest.platforms['darwin-aarch64']?.url || 'https://github.com/SaiAkashNeela/bucketstack/releases',
        x64: manifest.platforms['darwin-x86_64']?.url || 'https://github.com/SaiAkashNeela/bucketstack/releases',
      },
      windows: manifest.platforms['windows-x86_64']?.url || 'https://github.com/SaiAkashNeela/bucketstack/releases',
      linux: manifest.platforms['linux-x86_64']?.url || 'https://github.com/SaiAkashNeela/bucketstack/releases',
    };
  },
};
