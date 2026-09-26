const { isAdmin } = require("../lib/admin-auth");
const { stripeRequest } = require("../lib/stripe");

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed." });
  if (!isAdmin(req)) return json(res, 401, { error: "Unauthorized." });

  try {
    const params = new URLSearchParams();
    params.set("limit", "100");
    params.append("expand[]", "data.line_items");

    const result = await stripeRequest("/v1/checkout/sessions", { params });

    const orders = (result.data || [])
      .filter(s => s.payment_status === "paid" || s.payment_status === "no_payment_required")
      .map(s => {
        const shipping = (s.collected_information && s.collected_information.shipping_details) || s.shipping_details || null;

        return {
          id: s.id,
          created: s.created,
          order_number: (s.metadata && s.metadata.order_number) || s.id.slice(-10).toUpperCase(),
          status: (s.metadata && s.metadata.fulfillment_status) || "paid",
          carrier: (s.metadata && s.metadata.carrier) || "",
          tracking_number: (s.metadata && s.metadata.tracking_number) || "",
          amount_total: s.amount_total || 0,
          currency: s.currency || "usd",
          customer: {
            name: (s.customer_details && s.customer_details.name) || "",
            email: (s.customer_details && s.customer_details.email) || s.customer_email || "",
            phone: (s.customer_details && s.customer_details.phone) || ""
          },
          shipping,
          items: ((s.line_items && s.line_items.data) || []).map(li => ({
            name: li.description || "Item",
            quantity: li.quantity || 1,
            amount_total: li.amount_total || 0
          }))
        };
      });

    return json(res, 200, { orders });
  } catch (err) {
    const status = err.code === "STRIPE_NOT_CONFIGURED" ? 503 : 500;
    return json(res, status, { error: err.message || "Orders could not be loaded." });
  }
};
