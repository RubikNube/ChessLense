export const BACKEND_API_BASE_URL_STORAGE_KEY =
  "chesslense.backend-api-base-url";
export const BACKEND_API_TOKEN_STORAGE_KEY = "chesslense.backend-api-token";

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
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

export function getBackendUnavailableMessage(
  apiBaseUrl = loadConfiguredApiBaseUrl(),
) {
  if (apiBaseUrl) {
    return "Backend unavailable. Check the configured backend under Help > Backend Connection.";
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
  let response;

  try {
    response = await fetch(resolveApiUrl(path), {
      ...options,
      headers: createApiHeaders(options.headers),
    });
  } catch {
    throw new Error(getBackendUnavailableMessage());
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
