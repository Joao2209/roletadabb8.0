import fetch from "node-fetch";

const webhookSecret = process.env.SYNCPAY_WEBHOOK_SECRET;

let cachedToken = null;
let cachedTokenExpiresAt = 0;

const normalizeBaseUrl = (url) => (url ? url.replace(/\/+$/, "") : "");

const getConfig = () => ({
  baseUrl: process.env.SYNCPAY_BASE_URL,
  apiKey: process.env.SYNCPAY_API_KEY,
  clientId: process.env.SYNCPAY_CLIENT_ID,
  clientSecret: process.env.SYNCPAY_CLIENT_SECRET,
  postbackUrl: process.env.SYNCPAY_POSTBACK_URL,
  pixEndpoint: process.env.SYNCPAY_PIX_ENDPOINT || "/v1/gateway/api",
});

const getAuthToken = async () => {
  const { baseUrl, clientId, clientSecret } = getConfig();
  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error("SYNCPAY_CONFIG_MISSING");
  }
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }

  let response;
  try {
    response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/partner/v1/auth-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
  } catch (err) {
    throw new Error(`SYNCPAY_NETWORK_ERROR:${err.message}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SYNCPAY_AUTH_ERROR:${text}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  const expiresInMs = (data.expires_in || 3600) * 1000;
  cachedTokenExpiresAt = Date.now() + expiresInMs - 60 * 1000;
  return cachedToken;
};

export const createPixCharge = async ({ amount, description, externalId, ip, customer }) => {
  const { baseUrl, postbackUrl, pixEndpoint } = getConfig();
  if (!baseUrl) {
    throw new Error("SYNCPAY_CONFIG_MISSING");
  }

  const payload = {
    amount,
    description: description || "Recarga Roleta Premium",
    webhook_url: postbackUrl,
    client: {
      name: customer.name,
      cpf: customer.document,
      email: customer.email,
      phone: customer.phone,
    },
  };

  const token = await getAuthToken();

  let response;
  try {
    response = await fetch(`${normalizeBaseUrl(baseUrl)}${pixEndpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error(`SYNCPAY_NETWORK_ERROR:${err.message}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SYNCPAY_ERROR:${text}`);
  }

  return response.json();
};

export const verifyWebhookSignature = (req) => {
  if (!webhookSecret) {
    return true;
  }
  const signature = req.header("x-syncpay-signature");
  if (!signature) {
    return false;
  }

  return signature === webhookSecret;
};