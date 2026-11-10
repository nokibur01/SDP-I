// Google Gemini integration for BatchHub Assistant.
//
// The API key lives only in the server environment (GEMINI_API_KEY) and is sent
// as a request header — it is never returned to the client or written to logs.
// Uses the public REST API directly via fetch, so no extra dependency is needed.

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.5-flash";
const DEFAULT_FALLBACK_MODELS = "gemini-3.5-flash-lite";
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_TOOL_ROUNDS = 4; // model -> tools -> model ... upper bound per user message

/** Error with a code that is safe to map to a user-facing message. */
export class GeminiError extends Error {
  constructor(code, message, retryable = false) {
    super(message);
    this.name = "GeminiError";
    this.code = code; // "not_configured" | "rate_limited" | "blocked" | "timeout" | "upstream"
    this.retryable = retryable; // worth trying a different model
  }
}

export const isGeminiConfigured = () =>
  Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());

/** Primary model first, then fallbacks (GEMINI_MODEL, GEMINI_FALLBACK_MODELS), de-duplicated. */
const modelChain = () => {
  const primary = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS ?? DEFAULT_FALLBACK_MODELS)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([primary, ...fallbacks])];
};

/**
 * Call Gemini, moving on to the next model in the chain when one is overloaded,
 * rate-limited, timing out or retired. Non-retryable errors (bad key, blocked) stop immediately.
 */
const callGemini = async (body) => {
  let lastError;
  for (const model of modelChain()) {
    try {
      return await callModel(model, body);
    } catch (err) {
      lastError = err;
      if (!(err instanceof GeminiError) || !err.retryable) throw err;
      console.warn(`Gemini model ${model} unavailable (${err.message}); trying next model if configured.`);
    }
  }
  throw lastError;
};

const callModel = async (model, body) => {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new GeminiError("not_configured", "GEMINI_API_KEY is not set.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_ROOT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw new GeminiError("timeout", `Gemini (${model}) request timed out.`, true);
    throw new GeminiError("upstream", `Network error reaching Gemini: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Read the upstream message for the server log only; never forward it to the client.
    let detail = "";
    try {
      detail = (await response.json())?.error?.message || "";
    } catch {
      /* ignore non-JSON error bodies */
    }
    if (response.status === 429) throw new GeminiError("rate_limited", `Gemini (${model}) quota/rate limit: ${detail}`, true);
    if (response.status === 401 || response.status === 403) {
      throw new GeminiError("not_configured", `Gemini rejected the API key (${response.status}): ${detail}`);
    }
    if (response.status === 404) {
      // Model retired or unavailable to this key: try the next one
      throw new GeminiError("upstream", `Gemini model ${model} not available: ${detail}`, true);
    }
    if (response.status === 400) {
      throw new GeminiError("upstream", `Gemini rejected the request (400): ${detail}`);
    }
    // 500/503 = overloaded or temporary failure on Google's side
    throw new GeminiError("upstream", `Gemini (${model}) error ${response.status}: ${detail}`, response.status >= 500);
  }

  return response.json();
};

/**
 * Generate a reply, letting the model call BatchHub tools when it needs data.
 *
 * @param {object}   opts
 * @param {string}   opts.systemInstruction  Behaviour rules + who the user is
 * @param {Array}    opts.contents           Conversation so far in Gemini format
 * @param {Array}    opts.toolDeclarations   Tools this user's role may use
 * @param {Function} opts.runTool            async (name, args) => result object
 * @returns {Promise<{ text: string, toolsUsed: string[] }>}
 */
export const generateReply = async ({ systemInstruction, contents, toolDeclarations, runTool }) => {
  const conversation = [...contents];
  const toolsUsed = [];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const allowTools = round < MAX_TOOL_ROUNDS && toolDeclarations.length > 0;

    const data = await callGemini({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: conversation,
      ...(allowTools ? { tools: [{ functionDeclarations: toolDeclarations }] } : {}),
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    });

    const candidate = data?.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.length) {
      const reason = data?.promptFeedback?.blockReason || candidate?.finishReason || "empty response";
      throw new GeminiError("blocked", `Gemini returned no content (${reason}).`);
    }

    const parts = candidate.content.parts;
    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);

    if (calls.length === 0 || !allowTools) {
      const text = parts
        .filter((p) => typeof p.text === "string" && !p.thought)
        .map((p) => p.text)
        .join("")
        .trim();
      if (!text) throw new GeminiError("blocked", "Gemini returned an empty answer.");
      return { text, toolsUsed: [...new Set(toolsUsed)] };
    }

    // Keep the model's turn exactly as returned (preserves any thought signatures),
    // then answer every requested tool call with real BatchHub data.
    conversation.push(candidate.content);
    const responses = [];
    for (const call of calls) {
      const result = await runTool(call.name, call.args || {});
      toolsUsed.push(call.name);
      responses.push({ functionResponse: { name: call.name, response: { result } } });
    }
    conversation.push({ role: "user", parts: responses });
  }

  throw new GeminiError("upstream", "Gemini did not finish answering.");
};
