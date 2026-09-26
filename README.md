# Blended Krewe Creations

Family-built creations with Louisiana roots. **Made Together. Made Original.**

## Store architecture
The live site remains safe for pre-launch: products only become purchasable when they are explicitly added to `catalog.json` with `"active": true`.

The store flow is:

1. Released product → Add to Cart
2. Cart → secure Stripe Checkout
3. Paid Stripe Checkout Session becomes the order record
4. Private `/admin.html` dashboard reads paid Stripe orders
5. Fulfillment status moves through:
   - Paid
   - In Production
   - Ready to Ship
   - Shipped
   - Delivered
6. Marking an order **Shipped** requires carrier + tracking and sends the customer a branded tracking email when email is configured.

No unfinished "Design Preview" product can be purchased unless it is deliberately released in the catalog.

## Required Vercel environment variables
Add these to the Vercel project before enabling a live product:

- `STRIPE_SECRET_KEY` — Stripe secret key for Checkout and order management
- `BK_ADMIN_PASSWORD` — password used at `/admin.html`
- `BK_SESSION_SECRET` — long random secret used to sign the private admin session
- `RESEND_API_KEY` — Resend API key for automatic shipping emails
- `BK_FROM_EMAIL` — recommended: `Blended Krewe Creations <orders@blendedkrewe.com>`
- `STRIPE_AUTOMATIC_TAX` — optional; set to `true` only after Stripe Tax is configured

The sending domain for `orders@blendedkrewe.com` must be verified with the email provider before shipping emails will send.

## Releasing a product
Add an approved, physically tested product to `catalog.json`:

```json
{
  "sku": "BK-EXAMPLE-001",
  "name": "Exact Product Card Title",
  "description": "Customer-facing description",
  "price_cents": 2499,
  "shipping_cents": 725,
  "active": true
}
```

The `name` must exactly match the product-card title on the site. The storefront will automatically replace "Release pending" with the price and **Add to cart** button.

Use the packed/tested shipping amount. Do not activate a product until price and shipping have been confirmed.

## Admin
Private order dashboard:

`https://www.blendedkrewe.com/admin.html`

The dashboard is not linked from the public storefront and is marked `noindex`. Authentication is enforced server-side with an HttpOnly, Secure, SameSite cookie.

## Deployment
The repository is connected to Vercel. Pushes to `main` deploy through the existing Vercel project and custom domain.
