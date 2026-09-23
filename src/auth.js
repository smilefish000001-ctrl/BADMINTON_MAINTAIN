import { randomUUID, timingSafeEqual } from "node:crypto";

const sessionCookieName = "badminton_session";
const sessionMaxAgeSeconds = 60 * 60 * 8;

function safeEqual(actual, expected) {
  const actualBuffer = Buffer.from(String(actual));
  const expectedBuffer = Buffer.from(String(expected));
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function readCookie(cookieHeader, name) {
  const cookies = String(cookieHeader || "").split(";").map((value) => value.trim());
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
}

export function createAuthService({ adminUsername, adminPassword, secureCookie = false }) {
  const sessions = new Map();
  const cookieFlags = `HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionMaxAgeSeconds}${secureCookie ? "; Secure" : ""}`;

  function login(username, password) {
    if (!safeEqual(username, adminUsername) || !safeEqual(password, adminPassword)) return null;
    const token = randomUUID();
    sessions.set(token, Date.now() + sessionMaxAgeSeconds * 1000);
    return {
      cookie: `${sessionCookieName}=${encodeURIComponent(token)}; ${cookieFlags}`,
      user: { username: adminUsername, displayName: "系統管理員", role: "admin" },
    };
  }

  function getUser(cookieHeader) {
    const token = readCookie(cookieHeader, sessionCookieName);
    const expiresAt = sessions.get(token);
    if (!token || !expiresAt || expiresAt <= Date.now()) {
      if (token) sessions.delete(token);
      return null;
    }
    return { username: adminUsername, displayName: "系統管理員", role: "admin" };
  }

  function logout(cookieHeader) {
    const token = readCookie(cookieHeader, sessionCookieName);
    if (token) sessions.delete(token);
    return `${sessionCookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookie ? "; Secure" : ""}`;
  }

  return Object.freeze({ getUser, login, logout });
}

export async function readJsonBody(req, maxBytes = 16_384) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new Error("INVALID_JSON");
  }
}
