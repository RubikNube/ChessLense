export async function fetchJson(path, options = {}) {
  let response;

  try {
    response = await fetch(path, options);
  } catch {
    throw new Error(
      "Backend unavailable. Start the server on port 3001 or run ./dev.sh from the project root.",
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.details || data.error || "Request failed");
  }

  return data;
}
