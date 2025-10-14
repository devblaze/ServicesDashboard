export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNotes?: string;
  downloadUrl?: string;
  publishedAt?: string;
  platform?: string;
  isPrerelease: boolean;
}

export interface VersionInfo {
  version: string;
  platform: string;
}
