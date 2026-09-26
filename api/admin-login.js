const { verifyPassword, loginCookie } = require("../lib/admin-auth");

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

  if (!process.env.BK_ADMIN_PASSWORD || !process.env.BK_SESSION_SECRET) {
    return json(res, 503, { error: "Admin access has not been configured yet." });
  }
  if (!verifyPassword(body.password)) {
    return json(res, 401, { error: "Incorrect password." });
  }

  res.setHeader("Set-Cookie", loginCookie());
  return json(res, 200, { ok: true });
};
