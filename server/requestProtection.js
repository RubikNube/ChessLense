const crypto = require("crypto");

const DEFAULT_ANALYZE_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_ANALYZE_RATE_LIMIT_MAX = 30;
const DEFAULT_IMPORT_RATE_LIMIT_WINDOW_MS = 10 * 60_000;
const DEFAULT_IMPORT_RATE_LIMIT_MAX = 5;
const API_TOKEN_HEADER = "x-chesslense-api-token";

function normalizeString(value) {
	return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInteger(value, fallbackValue) {
	const parsedValue = Number.parseInt(value, 10);

	if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
		return fallbackValue;
	}

	return parsedValue;
}

function readBooleanEnv(value) {
	return ["1", "true", "yes", "on"].includes(
		normalizeString(value).toLowerCase(),
	);
}

function normalizeOrigin(value) {
	const trimmedValue = normalizeString(value);

	if (!trimmedValue) {
		return "";
	}

	try {
		const parsedUrl = new URL(trimmedValue);

		if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
			return "";
		}

		return parsedUrl.origin;
	} catch {
		return "";
	}
}

function parseAllowedOrigins(value) {
	if (typeof value !== "string") {
		return [];
	}

	return [...new Set(value.split(",").map(normalizeOrigin).filter(Boolean))];
}

function createOriginGateMiddleware({ allowedOrigins = [] } = {}) {
	const allowedOriginSet = new Set(allowedOrigins);

	return (req, res, next) => {
		const requestOrigin = normalizeString(req.get("origin"));

		if (
			!requestOrigin ||
			allowedOriginSet.size === 0 ||
			allowedOriginSet.has(requestOrigin)
		) {
			next();
			return;
		}

		res.status(403).json({
			error: "origin_forbidden",
			details: "Request origin is not allowed.",
		});
	};
}

function createCorsOptions({ allowedOrigins = [] } = {}) {
	const allowedOriginSet = new Set(allowedOrigins);

	return {
		origin(origin, callback) {
			if (
				!origin ||
				allowedOriginSet.size === 0 ||
				allowedOriginSet.has(origin)
			) {
				callback(null, true);
				return;
			}

			callback(null, false);
		},
	};
}

function getRequestApiToken(req) {
	const authorizationHeader = normalizeString(req.get("authorization"));

	if (/^bearer\s+/iu.test(authorizationHeader)) {
		return authorizationHeader.replace(/^bearer\s+/iu, "").trim();
	}

	return normalizeString(req.get(API_TOKEN_HEADER));
}

function tokensMatch(expectedToken, actualToken) {
	const expectedBuffer = Buffer.from(normalizeString(expectedToken));
	const actualBuffer = Buffer.from(normalizeString(actualToken));

	if (
		expectedBuffer.length === 0 ||
		expectedBuffer.length !== actualBuffer.length
	) {
		return false;
	}

	return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function createTokenAuthMiddleware({ apiToken, exemptPaths = [] } = {}) {
	const expectedToken = normalizeString(apiToken);
	const exemptPathSet = new Set(exemptPaths);

	return (req, res, next) => {
		if (!expectedToken || exemptPathSet.has(req.path)) {
			next();
			return;
		}

		if (tokensMatch(expectedToken, getRequestApiToken(req))) {
			next();
			return;
		}

		res.status(401).json({
			error: "unauthorized",
			details: "Missing or invalid API token.",
		});
	};
}

function createRateLimitMiddleware({
	windowMs = DEFAULT_ANALYZE_RATE_LIMIT_WINDOW_MS,
	maxRequests = DEFAULT_ANALYZE_RATE_LIMIT_MAX,
	message = "Too many requests. Try again later.",
	now = () => Date.now(),
} = {}) {
	const requestState = new Map();
	const normalizedWindowMs = parsePositiveInteger(
		windowMs,
		DEFAULT_ANALYZE_RATE_LIMIT_WINDOW_MS,
	);
	const normalizedMaxRequests = parsePositiveInteger(
		maxRequests,
		DEFAULT_ANALYZE_RATE_LIMIT_MAX,
	);
	let requestCounter = 0;

	return (req, res, next) => {
		const currentTime = now();
		const key = normalizeString(req.ip) || "unknown";
		const currentEntry = requestState.get(key);
		const entry =
			!currentEntry || currentEntry.resetAt <= currentTime
				? {
						count: 0,
						resetAt: currentTime + normalizedWindowMs,
					}
				: currentEntry;

		entry.count += 1;
		requestState.set(key, entry);
		requestCounter += 1;

		if (requestCounter % 500 === 0) {
			for (const [entryKey, value] of requestState.entries()) {
				if (value.resetAt <= currentTime) {
					requestState.delete(entryKey);
				}
			}
		}

		const remainingRequests = Math.max(0, normalizedMaxRequests - entry.count);
		const retryAfterSeconds = Math.max(
			1,
			Math.ceil((entry.resetAt - currentTime) / 1000),
		);

		res.setHeader("RateLimit-Limit", String(normalizedMaxRequests));
		res.setHeader("RateLimit-Remaining", String(remainingRequests));
		res.setHeader("RateLimit-Reset", String(retryAfterSeconds));

		if (entry.count > normalizedMaxRequests) {
			res.setHeader("Retry-After", String(retryAfterSeconds));
			res.status(429).json({
				error: "rate_limited",
				details: message,
			});
			return;
		}

		next();
	};
}

module.exports = {
	API_TOKEN_HEADER,
	DEFAULT_ANALYZE_RATE_LIMIT_MAX,
	DEFAULT_ANALYZE_RATE_LIMIT_WINDOW_MS,
	DEFAULT_IMPORT_RATE_LIMIT_MAX,
	DEFAULT_IMPORT_RATE_LIMIT_WINDOW_MS,
	createCorsOptions,
	createOriginGateMiddleware,
	createRateLimitMiddleware,
	createTokenAuthMiddleware,
	parseAllowedOrigins,
	parsePositiveInteger,
	readBooleanEnv,
};
