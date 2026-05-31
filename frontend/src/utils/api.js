export const BACKEND_API_BASE_URL_STORAGE_KEY =
  "chesslense.backend-api-base-url";
export const BACKEND_API_TOKEN_STORAGE_KEY = "chesslense.backend-api-token";
export const USE_LOCAL_API_BASE_URL_STORAGE_VALUE = "__use-local-api__";

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function getBrowserLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location;
}

export function normalizeApiBaseUrl(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return "";
    }

    return parsedUrl.href.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export function getApiBaseUrlSource(storage = getBrowserStorage()) {
  if (!storage) {
    return "unset";
  }

  const storedValue = storage.getItem(BACKEND_API_BASE_URL_STORAGE_KEY);

  if (storedValue === USE_LOCAL_API_BASE_URL_STORAGE_VALUE) {
    return "local";
  }

  const configuredApiBaseUrl = normalizeApiBaseUrl(storedValue ?? "");

  if (configuredApiBaseUrl) {
    return "configured";
  }

  return "unset";
}

export function loadConfiguredApiBaseUrl(storage = getBrowserStorage()) {
  if (!storage) {
    return "";
  }

  return normalizeApiBaseUrl(
    storage.getItem(BACKEND_API_BASE_URL_STORAGE_KEY) ?? "",
  );
}

export function normalizeApiToken(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function loadConfiguredApiToken(storage = getBrowserStorage()) {
  if (!storage) {
    return "";
  }

  return normalizeApiToken(
    storage.getItem(BACKEND_API_TOKEN_STORAGE_KEY) ?? "",
  );
}

export function saveConfiguredApiBaseUrl(value, storage = getBrowserStorage()) {
  if (!storage) {
    return false;
  }

  const normalizedValue = normalizeApiBaseUrl(value);

  if (normalizedValue) {
    storage.setItem(BACKEND_API_BASE_URL_STORAGE_KEY, normalizedValue);
  } else {
    storage.removeItem(BACKEND_API_BASE_URL_STORAGE_KEY);
  }

  return true;
}

export function saveUseLocalApiBaseUrl(storage = getBrowserStorage()) {
  if (!storage) {
    return false;
  }

  storage.setItem(
    BACKEND_API_BASE_URL_STORAGE_KEY,
    USE_LOCAL_API_BASE_URL_STORAGE_VALUE,
  );

  return true;
}

export function saveConfiguredApiToken(value, storage = getBrowserStorage()) {
  if (!storage) {
    return false;
  }

  const normalizedValue = normalizeApiToken(value);

  if (normalizedValue) {
    storage.setItem(BACKEND_API_TOKEN_STORAGE_KEY, normalizedValue);
  } else {
    storage.removeItem(BACKEND_API_TOKEN_STORAGE_KEY);
  }

  return true;
}

export function resolveApiUrl(path, apiBaseUrl = loadConfiguredApiBaseUrl()) {
  if (typeof path !== "string" || path.length === 0) {
    return path;
  }

  if (/^https?:\/\//iu.test(path) || !apiBaseUrl) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${apiBaseUrl}${path}`;
  }

  return `${apiBaseUrl}/${path}`;
}

export function isLocalApiOrigin(currentLocation = getBrowserLocation()) {
  const hostname = currentLocation?.hostname?.trim().toLowerCase() ?? "";

  if (!hostname) {
    return true;
  }

  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local")
  ) {
    return true;
  }

  if (
    /^127(?:\.\d{1,3}){3}$/u.test(hostname) ||
    /^10(?:\.\d{1,3}){3}$/u.test(hostname) ||
    /^192\.168(?:\.\d{1,3}){2}$/u.test(hostname)
  ) {
    return true;
  }

  const privateRangeMatch = hostname.match(/^172\.(\d{1,3})(?:\.\d{1,3}){2}$/u);
  if (!privateRangeMatch) {
    return false;
  }

  const secondOctet = Number.parseInt(privateRangeMatch[1], 10);
  return secondOctet >= 16 && secondOctet <= 31;
}

export function shouldRequireConfiguredApiBaseUrl(
  path,
  apiBaseUrlSource = getApiBaseUrlSource(),
  currentLocation = getBrowserLocation(),
) {
  if (typeof path !== "string" || path.length === 0) {
    return false;
  }

  if (/^https?:\/\//iu.test(path)) {
    return false;
  }

  return apiBaseUrlSource === "unset" && !isLocalApiOrigin(currentLocation);
}

export function getBackendUnavailableMessage(
  apiBaseUrl = loadConfiguredApiBaseUrl(),
  apiBaseUrlSource = getApiBaseUrlSource(),
  currentLocation = getBrowserLocation(),
) {
  if (apiBaseUrlSource === "configured") {
    return "Backend unavailable. Check the configured backend under Help > Backend Connection.";
  }

  if (
    apiBaseUrlSource === "unset" &&
    !apiBaseUrl &&
    !isLocalApiOrigin(currentLocation)
  ) {
    return "Backend unavailable. Configure a backend under Help > Backend Connection. Use local /api there only if this site serves the backend on the same origin.";
  }

  return "Backend unavailable. Start the server on port 3001, or configure a hosted backend under Help > Backend Connection.";
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function createApiHeaders(headers, apiToken = loadConfiguredApiToken()) {
  const resolvedHeaders = new Headers(headers ?? {});

  if (apiToken && !resolvedHeaders.has("Authorization")) {
    resolvedHeaders.set("Authorization", `Bearer ${apiToken}`);
  }

  return resolvedHeaders;
}

export async function fetchJson(path, options = {}) {
  const apiBaseUrl = loadConfiguredApiBaseUrl();
  const apiBaseUrlSource = getApiBaseUrlSource();

  if (shouldRequireConfiguredApiBaseUrl(path, apiBaseUrlSource)) {
    throw new Error(getBackendUnavailableMessage(apiBaseUrl, apiBaseUrlSource));
  }

  let response;

  try {
    response = await fetch(resolveApiUrl(path, apiBaseUrl), {
      ...options,
      headers: createApiHeaders(options.headers),
    });
  } catch {
    throw new Error(getBackendUnavailableMessage(apiBaseUrl, apiBaseUrlSource));
  }

  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data?.details ||
        data?.error ||
        `Request failed with status ${response.status}`,
    );
  }

  if (data === null) {
    throw new Error("Server returned an invalid JSON response.");
  }

  return data;
}
