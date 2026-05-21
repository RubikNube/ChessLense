const test = require("node:test");
const assert = require("node:assert/strict");
const {
	API_TOKEN_HEADER,
	createCorsOptions,
	createOriginGateMiddleware,
	createRateLimitMiddleware,
	createTokenAuthMiddleware,
	parseAllowedOrigins,
	readBooleanEnv,
} = require("./requestProtection");

function createMockRequest({
	headers = {},
	ip = "127.0.0.1",
	path = "/api/test",
} = {}) {
	const normalizedHeaders = Object.fromEntries(
		Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
	);

	return {
		headers: normalizedHeaders,
		ip,
		path,
		get(name) {
			return normalizedHeaders[name.toLowerCase()];
		},
	};
}

function createMockResponse() {
	return {
		headers: {},
		statusCode: 200,
		body: null,
		setHeader(name, value) {
			this.headers[name] = value;
		},
		status(code) {
			this.statusCode = code;
			return this;
		},
		json(value) {
			this.body = value;
			return this;
		},
	};
}

test("parseAllowedOrigins normalizes distinct HTTP origins", () => {
	assert.deepEqual(
		parseAllowedOrigins(
			" https://example.com/path , http://localhost:5173, https://example.com ",
		),
		["https://example.com", "http://localhost:5173"],
	);
});

test("readBooleanEnv recognizes common truthy values", () => {
	assert.equal(readBooleanEnv("true"), true);
	assert.equal(readBooleanEnv("YES"), true);
	assert.equal(readBooleanEnv("0"), false);
});

test("createOriginGateMiddleware rejects disallowed origins", () => {
	const middleware = createOriginGateMiddleware({
		allowedOrigins: ["https://app.example.com"],
	});
	const req = createMockRequest({
		headers: {
			origin: "https://evil.example.com",
		},
	});
	const res = createMockResponse();
	let nextCalled = false;

	middleware(req, res, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, false);
	assert.equal(res.statusCode, 403);
	assert.deepEqual(res.body, {
		error: "origin_forbidden",
		details: "Request origin is not allowed.",
	});
});

test("createCorsOptions allows configured origins and disables others", () => {
	const corsOptions = createCorsOptions({
		allowedOrigins: ["https://app.example.com"],
	});

	corsOptions.origin("https://app.example.com", (error, allowed) => {
		assert.equal(error, null);
		assert.equal(allowed, true);
	});

	corsOptions.origin("https://evil.example.com", (error, allowed) => {
		assert.equal(error, null);
		assert.equal(allowed, false);
	});
});

test("createTokenAuthMiddleware accepts bearer tokens and rejects missing ones", () => {
	const middleware = createTokenAuthMiddleware({
		apiToken: "secret-token",
		exemptPaths: ["/api/health"],
	});
	const unauthorizedReq = createMockRequest();
	const unauthorizedRes = createMockResponse();
	let unauthorizedNextCalled = false;

	middleware(unauthorizedReq, unauthorizedRes, () => {
		unauthorizedNextCalled = true;
	});

	assert.equal(unauthorizedNextCalled, false);
	assert.equal(unauthorizedRes.statusCode, 401);

	const authorizedReq = createMockRequest({
		headers: {
			authorization: "Bearer secret-token",
		},
	});
	let authorizedNextCalled = false;

	middleware(authorizedReq, createMockResponse(), () => {
		authorizedNextCalled = true;
	});

	assert.equal(authorizedNextCalled, true);

	const headerAuthorizedReq = createMockRequest({
		headers: {
			[API_TOKEN_HEADER]: "secret-token",
		},
	});
	let headerAuthorizedNextCalled = false;

	middleware(headerAuthorizedReq, createMockResponse(), () => {
		headerAuthorizedNextCalled = true;
	});

	assert.equal(headerAuthorizedNextCalled, true);

	const exemptReq = createMockRequest({
		path: "/api/health",
	});
	let exemptNextCalled = false;

	middleware(exemptReq, createMockResponse(), () => {
		exemptNextCalled = true;
	});

	assert.equal(exemptNextCalled, true);
});

test("createRateLimitMiddleware blocks requests over the configured limit", () => {
	let currentTime = 0;
	const middleware = createRateLimitMiddleware({
		windowMs: 60_000,
		maxRequests: 2,
		message: "Too many engine requests.",
		now: () => currentTime,
	});
	const req = createMockRequest();

	let firstNextCalled = false;
	middleware(req, createMockResponse(), () => {
		firstNextCalled = true;
	});
	assert.equal(firstNextCalled, true);

	let secondNextCalled = false;
	middleware(req, createMockResponse(), () => {
		secondNextCalled = true;
	});
	assert.equal(secondNextCalled, true);

	const thirdRes = createMockResponse();
	let thirdNextCalled = false;
	middleware(req, thirdRes, () => {
		thirdNextCalled = true;
	});

	assert.equal(thirdNextCalled, false);
	assert.equal(thirdRes.statusCode, 429);
	assert.deepEqual(thirdRes.body, {
		error: "rate_limited",
		details: "Too many engine requests.",
	});

	currentTime += 61_000;

	let resetNextCalled = false;
	middleware(req, createMockResponse(), () => {
		resetNextCalled = true;
	});
	assert.equal(resetNextCalled, true);
});
