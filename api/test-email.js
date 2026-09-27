const { isAdmin } = require("../lib/admin-auth");
const { sendEmail } = require("../lib/email");

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  if (!isAdmin(req)) return json(res, 401, { error: "Unauthorized." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const email = String(body.email || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return json(res, 400, { error: "Enter a valid email address." });

    const html =
      '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#211f19">' +
      '<h1 style="font-family:Georgia,serif;color:#183229">Your Krewe creation is on the way.</h1>' +
      '<p>This is a <strong>test shipping email</strong> from the Blended Krewe order dashboard.</p>' +
      '<p><strong>Order:</strong> BK-TEST-001<br><strong>Carrier:</strong> USPS<br><strong>Tracking:</strong> TEST123456789</p>' +
      '<p>If you received this, the website → Resend → customer email connection is working.</p>' +
      '<p>Thanks for supporting a family-built South Louisiana business.</p>' +
      '<p style="color:#716f64;font-size:13px">Blended Krewe Creations<br>Made Together. Made Original.</p>' +
      '</div>';

    const result = await sendEmail({
      to: email,
      subject: "Blended Krewe shipping email test",
      html
    });

    if (!result.sent) {
      const message = result.reason === "RESEND_NOT_CONFIGURED"
        ? "Resend is not configured on this deployment."
        : (result.reason || "Test email could not be sent.");
      return json(res, 503, { error: message });
    }

    return json(res, 200, { ok: true, id: result.id });
  } catch (err) {
    return json(res, 500, { error: err.message || "Test email could not be sent." });
  }
};
