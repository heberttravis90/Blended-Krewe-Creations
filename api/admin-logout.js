const { logoutCookie } = require("../lib/admin-auth");

module.exports = async function handler(req, res) {
  res.setHeader("Set-Cookie", logoutCookie());
  res.status(200).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true }));
};
