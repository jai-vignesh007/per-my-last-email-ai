// Serverless function: keeps your Gemini API key secret and only allows the
// four Per My Last Email jobs, so nobody can use your key as a free chatbot.
// Runs on Netlify at /api/translate.

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const MAX_INPUT = 2000;           // characters a visitor can send
const LIMIT = 10;                 // requests per visitor...
const WINDOW_MS = 10 * 60 * 1000; // ...per 10 minutes (best effort)

const PROMPTS = {
  decode:
    "You translate corporate jargon into what the writer actually means. Be brutally honest and funny, like a sarcastic coworker whispering the subtext, but never cruel, crude or offensive. Keep the same structure and roughly the same length. Reply with only the translation, no preamble, no quotes.",
  corp:
    "You rewrite blunt, honest messages as over-the-top corporate emails stuffed with buzzwords (circle back, synergy, bandwidth, leverage, align, per my last email), so polite it becomes hilarious. Keep the original meaning recognisable. Keep it under 120 words. Reply with only the email, no preamble, no quotes.",
  ldecode:
    "You translate LinkedIn posts into what the author is really saying. Expose the humblebrag, the engagement bait and the forced life lessons with dry, affectionate humor, never cruel, crude or offensive, and don't mock real tragedies or hardships. Keep the same structure and roughly the same length. Reply with only the translation, no preamble, no quotes.",
  lpost:
    "You turn ordinary, honest updates into the most stereotypical viral LinkedIn post possible: a dramatic hook, one short sentence per line, an unearned life lesson about leadership or B2B sales, gratitude, a question to drive engagement, a few emojis and 3 to 5 hashtags. Keep the real events recognisable and the tone playful, never mean. Keep it under 150 words. Reply with only the post, no preamble, no quotes."
};

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) { hits.set(ip, recent); return true; }
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export default async (req, context) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: "The site owner hasn’t added a Gemini API key yet." });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Send JSON with mode and text." }); }

  const mode = body && body.mode;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!PROMPTS[mode]) return json(400, { error: "Unknown mode." });
  if (!text) return json(400, { error: "Type something to translate first." });
  if (text.length > MAX_INPUT) return json(400, { error: `Keep it under ${MAX_INPUT} characters.` });

  const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown";
  if (rateLimited(ip)) return json(429, { error: "That’s a lot of synergy. Wait a few minutes and try again." });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: PROMPTS[mode] }] },
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: { temperature: 1, maxOutputTokens: 500 }
        })
      }
    );
    if (r.status === 429) return json(429, { error: "Smart translation hit today’s free limit. The highlighted version still works." });
    if (!r.ok) {
      console.error("Gemini error", r.status, await r.text());
      return json(502, { error: "Smart translation isn’t available right now. The highlighted version still works." });
    }
    const data = await r.json();
    const out = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
    if (!out) return json(502, { error: "The AI came back speechless. Try rewording it." });
    return json(200, { text: out });
  } catch (e) {
    console.error(e);
    return json(502, { error: "Smart translation isn’t available right now. The highlighted version still works." });
  }
};

export const config = { path: "/api/translate" };
