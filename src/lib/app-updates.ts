export interface InstalledAppInfo {
  version: string;
  build: number;
  platform: "web" | "android" | "ios";
}

export interface LatestRelease {
  tagName: string;
  version: string;
  name: string | null;
  body: string | null;
  htmlUrl: string;
  apkUrl: string | null;
  publishedAt: string | null;
  prerelease: boolean;
  draft: boolean;
}

export interface UpdateStatus {
  status: "idle" | "loading" | "error" | "update-available" | "up-to-date";
  installed: InstalledAppInfo;
  latest: LatestRelease | null;
  error: string | null;
}

const GITHUB_OWNER = "judealmaden";
const GITHUB_REPO = "KaiwaAI";
const GITHUB_LATEST_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;
const APK_BASENAME = "app-release.apk";

export const GITHUB_DOWNLOAD_URLS = {
  latest: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
  all: RELEASES_URL,
};

export function semverClean(raw: string): string {
  const s = String(raw || "").trim();
  const m = s.match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : "0.0.0";
}

export function semverCompare(aRaw: string, bRaw: string): -1 | 0 | 1 {
  const a = semverClean(aRaw).split(".").map(Number);
  const b = semverClean(bRaw).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

export function isUpdateAvailable(installed: string, latest: string): boolean {
  return semverCompare(latest, installed) === 1;
}

export async function getInstalledAppInfo(): Promise<InstalledAppInfo> {
  if (typeof window === "undefined") {
    return { version: "0.0.0", build: 0, platform: "web" };
  }

  try {
    const { Capacitor } = await import("@capacitor/core");
    const platform = Capacitor.getPlatform() as "web" | "android" | "ios";

    if (platform !== "web") {
      try {
        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        const build = Number(info.build) || 0;
        return {
          version: semverClean(info.version),
          build: Number.isFinite(build) ? build : 0,
          platform,
        };
      } catch {
        // Fall through to web fallback
      }
    }
  } catch {
    // Ignore Capacitor import failures on plain web
  }

  const pkg = (process.env.NEXT_PUBLIC_APP_VERSION ||
    (process.env as unknown as Record<string, string>).npm_package_version ||
    "0.0.0") as string;

  return { version: semverClean(pkg), build: 0, platform: "web" };
}

function findReleaseAssetApk(release: {
  assets?: Array<{ browser_download_url?: string; name?: string }>;
}): string | null {
  if (!Array.isArray(release.assets)) return null;
  const hit = release.assets.find(
    (a) =>
      a &&
      typeof a.name === "string" &&
      typeof a.browser_download_url === "string" &&
      (a.name.toLowerCase().endsWith(".apk") ||
        a.name.toLowerCase() === APK_BASENAME.toLowerCase())
  );
  return (hit && hit.browser_download_url) || null;
}

export async function fetchLatestRelease(signal?: AbortSignal): Promise<LatestRelease> {
  const res = await fetch(GITHUB_LATEST_URL, {
    signal,
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GitHub releases API error: ${res.status} ${res.statusText}`);
  }
  const r = (await res.json()) as {
    tag_name: string;
    name?: string | null;
    body?: string | null;
    html_url: string;
    prerelease?: boolean;
    draft?: boolean;
    published_at?: string | null;
    assets?: Array<{ browser_download_url?: string; name?: string }>;
  };

  const apkUrl = findReleaseAssetApk(r);
  const fallbackApkUrl = `${r.html_url}/download/${r.tag_name}/${APK_BASENAME}`;

  return {
    tagName: r.tag_name,
    version: semverClean(r.tag_name),
    name: typeof r.name === "string" ? r.name : null,
    body: typeof r.body === "string" ? r.body : null,
    htmlUrl: r.html_url,
    apkUrl: apkUrl || fallbackApkUrl,
    publishedAt: r.published_at || null,
    prerelease: !!r.prerelease,
    draft: !!r.draft,
  };
}
