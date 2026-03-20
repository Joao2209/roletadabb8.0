const { createPixCharge } = require("../../paymentService");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const payload = body || {};
    const { amount, customer } = payload;

    if (!amount || !customer) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Dados incompletos" }));
      return;
    }

    const pix = await createPixCharge({ amount, customer });

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        id: pix.id,
        qrCode: pix.qrCode,
        qrCodeText: pix.qrCodeText,
      })
    );
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Server error", detail: err.message || "" }));
  }
};
