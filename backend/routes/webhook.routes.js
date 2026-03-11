import express from "express";
import {
  receiveN8nWebhook,
  webhookHealthCheck,
  getWebhookLogs,
} from "../controllers/webhook.controller.js";

const router = express.Router();

/**
 * POST /api/webhooks/n8n
 * Receive webhooks from n8n
 */
router.post("/n8n", receiveN8nWebhook);

/**
 * GET /api/webhooks/health
 * Health check endpoint for n8n
 */
router.get("/health", webhookHealthCheck);

/**
 * GET /api/webhooks/logs
 * Get webhook logs for debugging
 */
router.get("/logs", getWebhookLogs);

/**
 * POST /api/webhooks/test
 * Test endpoint for webhook functionality
 */
router.post("/test", (req, res) => {
  const testData = {
    event: "webhook_test",
    receivedData: req.body,
    receivedAt: new Date().toISOString(),
    headers: {
      contentType: req.get("content-type"),
      userAgent: req.get("user-agent"),
    },
  };

  console.log("Test webhook received:", testData);

  res.status(200).json({
    success: true,
    message: "Test webhook received successfully",
    data: testData,
  });
});

export default router;
