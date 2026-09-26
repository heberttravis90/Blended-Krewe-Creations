function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "RESEND_NOT_CONFIGURED" };

  const from = process.env.BK_FROM_EMAIL || "Blended Krewe Creations <orders@blendedkrewe.com>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from, to: [to], subject, html })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { sent: false, reason: data?.message || "EMAIL_SEND_FAILED", detail: data };
  }
  return { sent: true, id: data.id };
}

function trackingUrl(carrier, tracking) {
  const c = String(carrier || "").toLowerCase();
  const t = encodeURIComponent(String(tracking || "").trim());
  if (!t) return "";
  if (c.includes("ups")) return "https://www.ups.com/track?loc=en_US&tracknum=" + t;
  if (c.includes("fedex")) return "https://www.fedex.com/fedextrack/?trknbr=" + t;
  if (c.includes("usps")) return "https://tools.usps.com/go/TrackConfirmAction?tLabels=" + t;
  return "";
}

module.exports = { sendEmail, trackingUrl, escapeHtml };
