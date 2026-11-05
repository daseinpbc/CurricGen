// Located at: netlify/functions/generateCurriculum.js
//
// Receives { jobTitle } from the front end, asks Gemini (with Google Search
// grounding) to research the role, and returns { curriculum: "<markdown>" }.
//
// Netlify environment variables:
//   GEMINI_API_KEY      (required)  your Gemini API key
//   GEMINI_MODEL        (optional)  override the default model name below
//   GEMINI_TIMEOUT_MS   (optional)  how long to wait for Gemini (default 24000)
//
// No npm packages needed: this uses the built-in fetch (Node 18+).

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const API_REVISION = '2026-05-20';
const DEFAULT_MODEL = 'gemini-3.8-flash';
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 24000;
const MAX_TITLE_LENGTH = 80;
const MAX_SOURCES = 10;

const reply = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// Keep the job title to plain, short text so it can't smuggle in extra instructions.
function cleanJobTitle(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f"`\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TITLE_LENGTH);
}

// The prompt lives on the server so visitors can't use your API key for other things.
function buildPrompt(jobTitle) {