const express = require("express");
const bodyParser = require("body-parser");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const BlockBee = require("@blockbee/api");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3000/api-docs/"], // Replace with allowed origins
  })
);
const port = 3000;

const API_KEY = "AinNjWaw0V5CGZPf3XxFPtWxcHWfDCr7W82rfNQMeLdw";

app.use(bodyParser.json());

// Swagger definition
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Payment API",
      version: "1.0.0",
      description: "API for creating payments and generating QR codes",
    },
    servers: [
      {
        url: `http://localhost:${port}`,
      },
    ],
  },
  apis: ["./index.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * components:
 *   schemas:
 *     CreatePaymentRequest:
 *       type: object
 *       required:
 *         - coin
 *         - own_address
 *         - callback_url
 *       properties:
 *         coin:
 *           type: string
 *         own_address:
 *           type: string
 *         callback_url:
 *           type: string
 *         parameters:
 *           type: object
 *           default: {}
 *     GenerateQRCodeRequest:
 *       type: object
 *       required:
 *         - coin
 *         - own_address
 *         - callback_url
 *       properties:
 *         coin:
 *           type: string
 *         own_address:
 *           type: string
 *         value:
 *           type: number
 *           default: 0.0
 *         size:
 *           type: integer
 *           default: 512
 *     PaymentCallback:
 *       type: object
 *       required:
 *         - address
 *         - amount
 *         - currency
 *         - status
 *       properties:
 *         address:
 *           type: string
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         status:
 *           type: string
 */

/**
 * @swagger
 * /create-payment:
 *   post:
 *     summary: Create a payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentRequest'
 *     responses:
 *       200:
 *         description: Payment address created successfully
 *       500:
 *         description: Internal server error
 */
app.post("/create-payment", async (req, res) => {
  try {
    const { coin, own_address, callback_url } = req.body;
    const query = new URLSearchParams({
      apikey: API_KEY,
      callback: callback_url,
      address: own_address,
      pending: "0",
      confirmations: "1",
      post: "0",
      json: "0",
      priority: "default",
      multi_token: "0",
      convert: "0",
    }).toString();

    const resp = await fetch(
      `https://api.blockbee.io/${coin}/create/?${query}`,
      { method: "GET" }
    );

    const data = await resp.json();
    res.status(200).json({
      status: "success",
      address: data.address_in,
      coin,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * @swagger
 * /generate-qrcode:
 *   post:
 *     summary: Generate a QR code for payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateQRCodeRequest'
 *     responses:
 *       200:
 *         description: QR code generated successfully
 *       500:
 *         description: Internal server error
 */
app.post("/generate-qrcode", async (req, res) => {
  try {
    const { coin, own_address, value, size } = req.body;
    const query = new URLSearchParams({
      apikey: API_KEY,
      address: own_address,
      value: value || 0.0,
      size: size || 512,
    }).toString();

    const resp = await fetch(
      `https://api.blockbee.io/${coin}/qrcode/?${query}`,
      { method: "GET" }
    );

    const data = await resp.json();

    res.status(200).json({
      status: "success",
      qr_code: data.qr_code,
      payment_uri: data.payment_uri,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * @swagger
 * /payment-callback:
 *   post:
 *     summary: Handle payment callback
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentCallback'
 *     responses:
 *       200:
 *         description: Callback processed successfully
 */
app.post("/payment-callback", (req, res) => {
  const { address, amount, currency, status } = req.body;

  if (status === "confirmed") {
    console.log(
      `Payment confirmed: ${amount} ${currency} on address ${address}`
    );
  } else {
    console.log(`Payment status: ${status}`);
  }

  res.status(200).json({
    status: "success",
    message: "Callback done successfully",
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Swagger API Docs: http://localhost:${port}/api-docs`);
});
