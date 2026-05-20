import { describe, expect, it } from "vitest";
import {
  BACKEND_API_BASE_URL_STORAGE_KEY,
  getBackendUnavailableMessage,
  loadConfiguredApiBaseUrl,
  normalizeApiBaseUrl,
  resolveApiUrl,
  saveConfiguredApiBaseUrl,
} from "./api.js";

function createStorage(initialValue = null) {
  let storedValue = initialValue;

  return {
    getItem(key) {
      return key === BACKEND_API_BASE_URL_STORAGE_KEY ? storedValue : null;
    },
    setItem(key, nextValue) {
      if (key === BACKEND_API_BASE_URL_STORAGE_KEY) {
        storedValue = nextValue;
      }
    },
    removeItem(key) {
      if (key === BACKEND_API_BASE_URL_STORAGE_KEY) {
        storedValue = null;
      }
    },
    readValue() {
      return storedValue;
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
    expect(storage.readValue()).toBe("https://api.example.com");
    expect(loadConfiguredApiBaseUrl(storage)).toBe("https://api.example.com");

    expect(saveConfiguredApiBaseUrl("", storage)).toBe(true);
    expect(storage.readValue()).toBeNull();
    expect(loadConfiguredApiBaseUrl(storage)).toBe("");
  });

  it("explains how to recover when backend requests fail", () => {
    expect(getBackendUnavailableMessage("https://api.example.com")).toContain(
      "Backend Connection",
    );
    expect(getBackendUnavailableMessage("")).toContain(
      "Start the server on port 3001",
    );
  });
});
