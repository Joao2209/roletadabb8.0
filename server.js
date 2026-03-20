import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { createPixCharge, verifyWebhookSignature } from "./paymentService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUILD = "2026-03-19-1";

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const pick = (obj, paths) => {
  for (const pathItem of paths) {
    const value = pathItem.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
    if (value) return value;
  }
  return undefined;
};

app.get("/health", (req, res) => {
  res.json({ status: "ok", build: BUILD });
});

app.use(
  express.static(__dirname, {
    etag: false,
    maxAge: 0,
    setHeaders(res) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    },
  })
);
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/api/payments/deposit", async (req, res, next) => {
  try {
    const { amount, customer } = req.body || {};
    const baseAmount = Number(amount);
    if (!baseAmount || baseAmount <= 0) {
      return res.status(400).json({ error: "Valor inválido" });
    }
    if (!customer || !customer.name || !customer.email || !customer.document || !customer.phone) {
      return res.status(400).json({ error: "Dados do cliente são obrigatórios" });
    }

    const charge = await createPixCharge({
      amount: baseAmount,
      description: "Roleta Premium recarga",
      externalId: `manual_${Date.now()}`,
      ip: req.ip,
      customer,
    });

    const qrBase64 =
      pick(charge, ["paymentCodeBase64", "qrCodeBase64", "data.paymentCodeBase64", "data.qrCodeBase64"]) || null;
    const qrText =
      pick(charge, ["paymentCode", "qrCodeText", "data.paymentCode", "data.qrCodeText", "emv", "pix_code"]) || null;

    let qrCodeDataUrl = qrBase64 ? `data:image/png;base64,${qrBase64}` : null;
    if (!qrCodeDataUrl && qrText) {
      try {
        const QRCode = (await import("qrcode")).default;
        qrCodeDataUrl = await QRCode.toDataURL(qrText);
      } catch {
        qrCodeDataUrl = null;
      }
    }

    res.status(201).json({
      amount: baseAmount,
      qrCode: qrCodeDataUrl,
      qrCodeText: qrText,
      raw: qrCodeDataUrl ? undefined : charge,
    });
  } catch (err) {
    if (err.message === "SYNCPAY_CONFIG_MISSING") {
      return res.status(500).json({ error: "Configuração Sync Pay ausente", detail: err.message });
    }
    if (err.message && err.message.startsWith("SYNCPAY_AUTH_ERROR")) {
      return res.status(502).json({ error: "Credenciais Sync Pay inválidas", detail: err.message });
    }
    if (err.message && err.message.startsWith("SYNCPAY_NETWORK_ERROR")) {
      return res.status(502).json({ error: "Erro de rede com Sync Pay", detail: err.message });
    }
    if (err.message && err.message.startsWith("SYNCPAY_ERROR")) {
      return res.status(502).json({ error: "Erro Sync Pay", detail: err.message });
    }
    next(err);
  }
});

app.post("/api/payments/syncpay/webhook", (req, res) => {
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: "Invalid signature" });
  }
  res.json({ ok: true });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: `Server error [${BUILD}]`, detail: err.message });
});

app.listen(PORT, () => {
  console.log(`Roleta Premium API running on port ${PORT} [${BUILD}]`);
});