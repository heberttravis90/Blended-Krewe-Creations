const { isAdmin } = require("../lib/admin-auth");
const { stripeRequest } = require("../lib/stripe");
const { sendEmail, trackingUrl, escapeHtml } = require("../lib/email");

const ALLOWED = new Set(["paid", "in_production", "ready_to_ship", "shipped", "delivered"]);

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  if (!isAdmin(req)) return json(res, 401, { error: "Unauthorized." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const id = String(body.id || "");
    const status = String(body.status || "");
    const carrier = String(body.carrier || "").trim();
    const tracking = String(body.tracking_number || "").trim();

    if (!id.startsWith("cs_")) return json(res, 400, { error: "Invalid order ID." });
    if (!ALLOWED.has(status)) return json(res, 400, { error: "Invalid order status." });
    if (status === "shipped" && (!carrier || !tracking)) {
      return json(res, 400, { error: "Carrier and tracking number are required before marking an order shipped." });
    }

    const session = await stripeRequest("/v1/checkout/sessions/" + encodeURIComponent(id));
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return json(res, 409, { error: "This checkout session is not paid." });
    }

    const previousStatus = (session.metadata && session.metadata.fulfillment_status) || "paid";
    const previousTracking = (session.metadata && session.metadata.tracking_number) || "";

    const params = new URLSearchParams();
    params.set("metadata[fulfillment_status]", status);
    params.set("metadata[carrier]", carrier);
    params.set("metadata[tracking_number]", tracking);

    await stripeRequest("/v1/checkout/sessions/" + encodeURIComponent(id), { method: "POST", params });

    let email = { sent: false, reason: "NOT_REQUIRED" };
    const shouldEmail = status === "shipped" && (previousStatus !== "shipped" || previousTracking !== tracking);
    const customerEmail = (session.customer_details && session.customer_details.email) || session.customer_email || "";

    if (shouldEmail && customerEmail) {
      const link = trackingUrl(carrier, tracking);
      const orderNumber = (session.metadata && session.metadata.order_number) || id.slice(-10).toUpperCase();
      const trackingButton = link
        ? '<p style="margin:24px 0"><a href="' + escapeHtml(link) + '" style="display:inline-block;background:#183229;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">Track your package</a></p>'
        : "";

      const html =
        '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#211f19">' +
        '<h1 style="font-family:Georgia,serif;color:#183229">Your Krewe creation is on the way.</h1>' +
        '<p>Good news — order <strong>' + escapeHtml(orderNumber) + '</strong> has shipped.</p>' +
        '<p><strong>Carrier:</strong> ' + escapeHtml(carrier) + '<br><strong>Tracking:</strong> ' + escapeHtml(tracking) + '</p>' +
        trackingButton +
        '<p>Thanks for supporting a family-built South Louisiana business.</p>' +
        '<p style="color:#716f64;font-size:13px">Blended Krewe Creations<br>Made Together. Made Original.</p>' +
        '</div>';

      email = await sendEmail({
        to: customerEmail,
        subject: "Your Blended Krewe order has shipped — " + orderNumber,
        html
      });
    }

    return json(res, 200, { ok: true, status, email });
  } catch (err) {
    const code = err.code === "STRIPE_NOT_CONFIGURED" ? 503 : 500;
    return json(res, code, { error: err.message || "Order status could not be updated." });
  }
};
