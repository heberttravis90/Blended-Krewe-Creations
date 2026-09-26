function getStripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const err = new Error("Stripe is not configured.");
    err.code = "STRIPE_NOT_CONFIGURED";
    throw err;
  }
  return key;
}

async function stripeRequest(path, { method = "GET", params } = {}) {
  const key = getStripeKey();
  const form = params instanceof URLSearchParams ? params : new URLSearchParams(params || {});
  let url = "https://api.stripe.com" + path;
  const options = {
    method,
    headers: { Authorization: "Bearer " + key }
  };

  if (method === "GET") {
    const query = form.toString();
    if (query) url += "?" + query;
  } else {
    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.body = form.toString();
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.error?.message || "Stripe request failed.");
    err.status = response.status;
    err.stripe = data?.error || null;
    throw err;
  }
  return data;
}

module.exports = { stripeRequest };
