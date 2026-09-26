const crypto = require("crypto");
const catalog = require("../catalog.json");
const { stripeRequest } = require("../lib/stripe");

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const requested = Array.isArray(body.items) ? body.items : [];

    if (!requested.length) return json(res, 400, { error: "Your cart is empty." });
    if (requested.length > 20) return json(res, 400, { error: "Too many cart items." });

    const bySku = new Map((catalog.products || []).filter(p => p.active).map(p => [p.sku, p]));
    const items = [];
    let shippingCents = 0;

    for (const row of requested) {
      const product = bySku.get(String(row.sku || ""));
      const quantity = Math.max(1, Math.min(10, Number(row.quantity || 1)));

      if (!product) {
        return json(res, 409, { error: "One of the products in your cart is not currently available." });
      }
      if (!Number.isInteger(product.price_cents) || product.price_cents <= 0) {
        return json(res, 409, { error: product.name + " does not have a valid store price yet." });
      }
      if (!Number.isInteger(product.shipping_cents) || product.shipping_cents < 0) {
        return json(res, 409, { error: product.name + " does not have a packed shipping rate yet." });
      }

      items.push({ product, quantity });
      shippingCents += product.shipping_cents * quantity;
    }

    const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
    const host = req.headers["x-forwarded-host"] || req.headers.host || "www.blendedkrewe.com";
    const origin = proto + "://" + host;
    const orderNumber = "BK-" + crypto.randomUUID().split("-")[0].toUpperCase();

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", origin + "/success.html?order=" + encodeURIComponent(orderNumber));
    params.set("cancel_url", origin + "/#designs");
    params.set("customer_creation", "always");
    params.set("phone_number_collection[enabled]", "true");
    params.set("shipping_address_collection[allowed_countries][0]", "US");
    params.set("metadata[order_source]", "blended-krewe-store");
    params.set("metadata[order_number]", orderNumber);
    params.set("metadata[fulfillment_status]", "paid");

    if (String(process.env.STRIPE_AUTOMATIC_TAX || "").toLowerCase() === "true") {
      params.set("automatic_tax[enabled]", "true");
    }

    items.forEach(({ product, quantity }, i) => {
      params.set("line_items[" + i + "][price_data][currency]", "usd");
      params.set("line_items[" + i + "][price_data][unit_amount]", String(product.price_cents));
      params.set("line_items[" + i + "][price_data][product_data][name]", product.name);
      params.set("line_items[" + i + "][price_data][product_data][metadata][sku]", product.sku);
      if (product.description) {
        params.set("line_items[" + i + "][price_data][product_data][description]", String(product.description).slice(0, 500));
      }
      params.set("line_items[" + i + "][quantity]", String(quantity));
    });

    if (shippingCents > 0) {
      params.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
      params.set("shipping_options[0][shipping_rate_data][display_name]", "Standard shipping");
      params.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(shippingCents));
      params.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
    }

    const session = await stripeRequest("/v1/checkout/sessions", { method: "POST", params });
    return json(res, 200, { url: session.url, orderNumber });
  } catch (err) {
    const status = err.code === "STRIPE_NOT_CONFIGURED" ? 503 : 500;
    return json(res, status, { error: err.message || "Checkout could not be started." });
  }
};
