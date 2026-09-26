const crypto = require("crypto");

const COOKIE_NAME = "bk_admin";

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function sessionToken() {
  const secret = process.env.BK_SESSION_SECRET;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update("blended-krewe-admin-v1").digest("hex");
}

function isAdmin(req) {
  const token = sessionToken();
  if (!token) return false;
  const cookies = String(req.headers.cookie || "")
    .split(";")
    .map(v => v.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const idx = pair.indexOf("=");
      if (idx > -1) acc[pair.slice(0, idx)] = decodeURIComponent(pair.slice(idx + 1));
      return acc;
    }, {});
  return safeEqual(cookies[COOKIE_NAME], token);
}

function verifyPassword(password) {
  const configured = process.env.BK_ADMIN_PASSWORD;
  if (!configured) return false;
  return safeEqual(password, configured);
}

function loginCookie() {
  const token = sessionToken();
  if (!token) return null;
  return COOKIE_NAME + "=" + encodeURIComponent(token) + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200";
}

function logoutCookie() {
  return COOKIE_NAME + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

module.exports = { isAdmin, verifyPassword, loginCookie, logoutCookie };
