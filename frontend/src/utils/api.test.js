import { describe, expect, it } from "vitest";
import {
  BACKEND_API_BASE_URL_STORAGE_KEY,
  BACKEND_API_TOKEN_STORAGE_KEY,
  createApiHeaders,
  getApiBaseUrlSource,
  getBackendUnavailableMessage,
  isLocalApiOrigin,
  loadConfiguredApiBaseUrl,
  loadConfiguredApiToken,
  normalizeApiBaseUrl,
  normalizeApiToken,
  resolveApiUrl,
  saveConfiguredApiBaseUrl,
  saveConfiguredApiToken,
  saveUseLocalApiBaseUrl,
  shouldRequireConfiguredApiBaseUrl,
} from "./api.js";

function createStorage(initialValue = null) {
  const storedValues = new Map(
    initialValue
      ? Object.entries({
          [BACKEND_API_BASE_URL_STORAGE_KEY]: initialValue,
        })
      : [],
  );

  return {
    getItem(key) {
      return storedValues.get(key) ?? null;
    },
    setItem(key, nextValue) {
      storedValues.set(key, nextValue);
    },
    removeItem(key) {
      storedValues.delete(key);
    },
    readValue(key) {
      return storedValues.get(key) ?? null;
    },
  };
}

describe("api helpers", () => {
  it("normalizes configured API base URLs", () => {
    expect(normalizeApiBaseUrl(" https://api.example.com/// ")).toBe(
      "https://api.example.com",
    );
    expect(normalizeApiBaseUrl("http://localhost:3001/")).toBe(
      "http://localhost:3001",
    );
    expect(normalizeApiBaseUrl("api.example.com")).toBe("");
    expect(normalizeApiBaseUrl("")).toBe("");
    expect(normalizeApiBaseUrl(undefined)).toBe("");
  });

  it("normalizes backend API tokens", () => {
    expect(normalizeApiToken(" secret-token ")).toBe("secret-token");
    expect(normalizeApiToken("")).toBe("");
    expect(normalizeApiToken(undefined)).toBe("");
  });

  it("keeps local relative API paths when no production base is configured", () => {
    expect(resolveApiUrl("/api/analyze", "")).toBe("/api/analyze");
  });

  it("prefixes relative API paths with the configured production backend", () => {
    expect(resolveApiUrl("/api/analyze", "https://api.example.com")).toBe(
      "https://api.example.com/api/analyze",
    );
    expect(resolveApiUrl("api/analyze", "https://api.example.com")).toBe(
      "https://api.example.com/api/analyze",
    );
  });

  it("leaves absolute URLs untouched", () => {
    expect(
      resolveApiUrl(
        "https://other.example.com/api/analyze",
        "https://api.example.com",
      ),
    ).toBe("https://other.example.com/api/analyze");
  });

  it("loads and saves the configured backend URL in browser storage", () => {
    const storage = createStorage();

    expect(saveConfiguredApiBaseUrl("https://api.example.com/", storage)).toBe(
      true,
    );
    expect(storage.readValue(BACKEND_API_BASE_URL_STORAGE_KEY)).toBe(
      "https://api.example.com",
    );
    expect(loadConfiguredApiBaseUrl(storage)).toBe("https://api.example.com");

    expect(saveConfiguredApiBaseUrl("", storage)).toBe(true);
    expect(storage.readValue(BACKEND_API_BASE_URL_STORAGE_KEY)).toBeNull();
    expect(loadConfiguredApiBaseUrl(storage)).toBe("");
    expect(getApiBaseUrlSource(storage)).toBe("unset");
  });

  it("prefers a saved browser backend when one exists", () => {
    const storage = createStorage("https://saved.example.com");

    expect(loadConfiguredApiBaseUrl(storage)).toBe("https://saved.example.com");
    expect(getApiBaseUrlSource(storage)).toBe("configured");
  });

  it("can force local /api explicitly", () => {
    const storage = createStorage();

    expect(saveUseLocalApiBaseUrl(storage)).toBe(true);
    expect(loadConfiguredApiBaseUrl(storage)).toBe("");
    expect(getApiBaseUrlSource(storage)).toBe("local");
  });

  it("detects local development origins", () => {
    expect(isLocalApiOrigin({ hostname: "localhost" })).toBe(true);
    expect(isLocalApiOrigin({ hostname: "127.0.0.1" })).toBe(true);
    expect(isLocalApiOrigin({ hostname: "192.168.1.25" })).toBe(true);
    expect(isLocalApiOrigin({ hostname: "rubiknube.de" })).toBe(false);
  });

  it("requires a configured backend on hosted sites when no override exists", () => {
    expect(
      shouldRequireConfiguredApiBaseUrl("/api/analyze", "unset", {
        hostname: "rubiknube.de",
      }),
    ).toBe(true);
    expect(
      shouldRequireConfiguredApiBaseUrl("/api/analyze", "unset", {
        hostname: "localhost",
      }),
    ).toBe(false);
    expect(
      shouldRequireConfiguredApiBaseUrl("/api/analyze", "local", {
        hostname: "rubiknube.de",
      }),
    ).toBe(false);
    expect(
      shouldRequireConfiguredApiBaseUrl(
        "https://api.example.com/analyze",
        "unset",
        { hostname: "rubiknube.de" },
      ),
    ).toBe(false);
  });

  it("loads and saves the configured backend token in browser storage", () => {
    const storage = createStorage();

    expect(saveConfiguredApiToken(" secret-token ", storage)).toBe(true);
    expect(storage.readValue(BACKEND_API_TOKEN_STORAGE_KEY)).toBe(
      "secret-token",
    );
    expect(loadConfiguredApiToken(storage)).toBe("secret-token");

    expect(saveConfiguredApiToken("", storage)).toBe(true);
    expect(storage.readValue(BACKEND_API_TOKEN_STORAGE_KEY)).toBeNull();
    expect(loadConfiguredApiToken(storage)).toBe("");
  });

  it("adds the configured backend token as a bearer Authorization header", () => {
    const headers = createApiHeaders(
      {
        "Content-Type": "application/json",
      },
      "secret-token",
    );

    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer secret-token");
  });

  it("keeps an explicit Authorization header when one is already provided", () => {
    const headers = createApiHeaders(
      {
        Authorization: "Bearer existing-token",
      },
      "secret-token",
    );

    expect(headers.get("Authorization")).toBe("Bearer existing-token");
  });

  it("explains how to recover when backend requests fail", () => {
    expect(
      getBackendUnavailableMessage("https://api.example.com", "configured"),
    ).toContain("configured backend");
    expect(
      getBackendUnavailableMessage("", "unset", { hostname: "rubiknube.de" }),
    ).toContain("Configure a backend");
    expect(
      getBackendUnavailableMessage("", "local", { hostname: "localhost" }),
    ).toContain("Start the server on port 3001");
  });
});
