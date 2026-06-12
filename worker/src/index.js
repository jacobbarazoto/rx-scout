// Cloudflare Worker: retail stock proxy. Exists because Kroger/Walgreens sit
// behind Akamai bot protection that 403s Google Cloud / AWS egress. Cloudflare
// Workers run from different IP ranges that Akamai often allows — this Worker is
// the experiment to confirm that, and the home for retail lookups if it works.
//
// Secrets (wrangler secret put ...): KROGER_CLIENT_ID, KROGER_CLIENT_SECRET

const KROGER = "https://api.kroger.com/v1";

// Only let the rx-scout app (and local dev) use this proxy from the browser.
const ALLOWED_ORIGINS = new Set([
  "https://rx-scout.web.app",
  "https://rx-scout.firebaseapp.com",
  "http://localhost:5173",
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://rx-scout.web.app";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };
}

export default {
  async fetch(request, env) {
    const CORS = corsHeaders(request);
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const term = (url.searchParams.get("term") || "").trim().split(/\s+/)[0];
    const lat = parseFloat(url.searchParams.get("lat"));
    const lng = parseFloat(url.searchParams.get("lng"));
    if (!term || Number.isNaN(lat) || Number.isNaN(lng)) {
      return json({ error: "term, lat, and lng are required" }, 400, CORS);
    }

    try {
      const basic = btoa(`${env.KROGER_CLIENT_ID}:${env.KROGER_CLIENT_SECRET}`);
      const tokRes = await fetch(`${KROGER}/connect/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials&scope=product.compact",
      });
      if (!tokRes.ok) throw new Error(`token ${tokRes.status}`);
      const { access_token } = await tokRes.json();
      const auth = { Authorization: `Bearer ${access_token}` };

      const locRes = await fetch(
        `${KROGER}/locations?filter.latLong.near=${lat},${lng}&filter.limit=3`,
        { headers: auth },
      );
      if (!locRes.ok) throw new Error(`locations ${locRes.status}`);
      const stores = (await locRes.json()).data || [];

      const out = [];
      for (const store of stores.slice(0, 2)) {
        const prodRes = await fetch(
          `${KROGER}/products?filter.term=${encodeURIComponent(term)}` +
            `&filter.locationId=${store.locationId}&filter.limit=3`,
          { headers: auth },
        );
        if (!prodRes.ok) continue;
        const products = ((await prodRes.json()).data || [])
          .map((p) => {
            const item = (p.items && p.items[0]) || {};
            return {
              description: p.description,
              brand: p.brand,
              size: item.size || null,
              price: item.price ? item.price.regular : null,
              stockLevel: item.inventory ? item.inventory.stockLevel : null,
              aisle:
                p.aisleLocations && p.aisleLocations[0] ? p.aisleLocations[0].description : null,
            };
          })
          .filter((p) => p.price != null || p.stockLevel);
        if (products.length) {
          out.push({
            name: store.name,
            address: [store.address?.addressLine1, store.address?.city, store.address?.state]
              .filter(Boolean)
              .join(", "),
            products,
          });
        }
      }
      return json({ stores: out }, 200, CORS);
    } catch (err) {
      return json({ error: `Kroger lookup failed: ${err.message}` }, 502, CORS);
    }
  },
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}
