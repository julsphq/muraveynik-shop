import type { Product } from "./store/api";

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getApiOrigin(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  if (!raw) {
    return window.location.origin;
  }
  try {
    return new URL(raw).origin;
  } catch {
    return window.location.origin;
  }
}

function normalizeWindowsPath(raw: string): string {
  return raw.replace("file://", "").replaceAll("\\", "/");
}

function fromLocalFilePathToWebPath(raw: string): string | null {
  const normalized = normalizeWindowsPath(raw);
  const lower = normalized.toLowerCase();
  const distMarker = "/dist/";
  const distIndex = lower.lastIndexOf(distMarker);

  // Convert ".../frontend/dist/assets/image.png" -> "/assets/image.png"
  if (distIndex >= 0) {
    const tail = normalized.slice(distIndex + distMarker.length);
    if (!tail) {
      return null;
    }
    return `/${tail.replace(/^\/+/, "")}`;
  }

  return null;
}

function isFrontendDistImagePath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/").replace(/^\/+/, "").toLowerCase();
  return normalized.startsWith("product-images/") || normalized.startsWith("assets/");
}

function normalizeImageUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  // Map local filesystem paths to web paths when they point to frontend/dist.
  if (/^[a-zA-Z]:[\\/]/.test(value) || value.startsWith("file://")) {
    const mapped = fromLocalFilePathToWebPath(value);
    if (!mapped) {
      return null;
    }
    return `${window.location.origin}${mapped}`;
  }

  const normalizedPath = value.replaceAll("\\", "/");
  const withLeadingSlash = normalizedPath.startsWith("/")
    ? normalizedPath
    : `/${normalizedPath}`;
  if (isFrontendDistImagePath(withLeadingSlash)) {
    return `${window.location.origin}${withLeadingSlash}`;
  }
  return `${getApiOrigin()}${withLeadingSlash}`;
}

export function getProductImageUrl(product: Pick<Product, "name" | "sku" | "imageUrl">): string {
  if (product.imageUrl) {
    const normalized = normalizeImageUrl(product.imageUrl);
    if (normalized) {
      return normalized;
    }
  }

  const name = esc(product.name);
  const sku = esc(product.sku);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4caf50" />
      <stop offset="100%" stop-color="#2e7d32" />
    </linearGradient>
  </defs>
  <rect width="640" height="420" fill="url(#g)" />
  <rect x="18" y="18" width="604" height="384" rx="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.32)" />
  <text x="36" y="64" font-size="28" font-family="Arial, sans-serif" fill="#ecf6ec">Муравейник</text>
  <text x="36" y="208" font-size="32" font-weight="700" font-family="Arial, sans-serif" fill="#ffffff">${name}</text>
  <text x="36" y="252" font-size="24" font-family="Arial, sans-serif" fill="#e8f5e9">SKU: ${sku}</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
