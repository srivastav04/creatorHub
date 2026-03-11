import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_NEW_VIDEO_WEBHOOK_URL = process.env.N8N_NEW_VIDEO_WEBHOOK_URL;
const WEBHOOK_LOG = [];

/**
 * Send data to n8n webhook
 */
export const sendDataToN8n = async (data) => {
  try {
    if (!N8N_WEBHOOK_URL) {
      console.error("N8N_WEBHOOK_URL is not defined in .env");
      return;
    }

    const payload = {
      ...data,
      sentAt: new Date().toISOString(),
      source: "YouTube Backend",
    };

    const response = await axios.post(N8N_WEBHOOK_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "YouTube-Backend/1.0",
      },
      timeout: 10000,
    });

    console.log("✓ Data successfully sent to n8n:", data.event || data.type);
    logWebhookEvent("outgoing", { data: payload, response: response.data });

    return response.data;
  } catch (error) {
    const errorLog = {
      type: "outgoing_error",
      eventType: data.event || data.type,
      message: error.message,
      timestamp: new Date().toISOString(),
      status: error.response?.status,
      responseData: error.response?.data,
    };

    console.error("✗ Error sending data to n8n:", error.message);
    logWebhookEvent("error", errorLog);

    // Don't throw - let the main operation continue even if webhook fails
    return { error: error.message };
  }
};

/**
 * Send new-video notification data to the dedicated n8n webhook.
 * Called by receiveCheckResult when new videos are detected for a channel.
 *
 * Payload sent to n8n:
 *   { event, channel_id, new_videos[], subscribers[{ userId, email }], sentAt, source }
 *
 * @param {{ channel_id: string, new_videos: string[], subscribers: Array<{ userId: string, email: string|null }> }} data
 */
export const sendNewVideoNotification = async (data) => {
  try {
    if (!N8N_NEW_VIDEO_WEBHOOK_URL) {
      console.error("N8N_NEW_VIDEO_WEBHOOK_URL is not defined in .env");
      return;
    }

    const payload = {
      event: "new_video_detected",
      channel_id: data.channel_id,
      new_videos: data.new_videos,
      subscribers: data.subscribers,
      sentAt: new Date().toISOString(),
      source: "YouTube Backend",
    };

    const response = await axios.post(N8N_NEW_VIDEO_WEBHOOK_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "YouTube-Backend/1.0",
      },
      timeout: 10000,
    });

    console.log(
      `✓ New-video notification sent to n8n for channel ${data.channel_id}`,
    );
    logWebhookEvent("outgoing_new_video", {
      data: payload,
      response: response.data,
    });

    return response.data;
  } catch (error) {
    const errorLog = {
      type: "outgoing_new_video_error",
      channel_id: data.channel_id,
      message: error.message,
      timestamp: new Date().toISOString(),
      status: error.response?.status,
      responseData: error.response?.data,
    };

    console.error(
      `✗ Error sending new-video notification for ${data.channel_id}:`,
      error.message,
    );
    logWebhookEvent("error", errorLog);

    // Don't throw - let the main operation continue even if webhook fails
    return { error: error.message };
  }
};

/**
 * Log webhook events for debugging and auditing
 */
export const logWebhookEvent = (direction, data) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    direction, // 'incoming', 'outgoing', or 'error'
    data,
    id: Math.random().toString(36).substr(2, 9),
  };

  WEBHOOK_LOG.push(logEntry);

  // Keep only the last 100 logs to prevent memory issues
  if (WEBHOOK_LOG.length > 100) {
    WEBHOOK_LOG.shift();
  }

  return logEntry;
};

/**
 * Get webhook logs for debugging
 */
export const getWebhookLogs = () => {
  return WEBHOOK_LOG;
};

/**
 * Clear webhook logs
 */
export const clearWebhookLogs = () => {
  WEBHOOK_LOG.length = 0;
  console.log("Webhook logs cleared");
};

/**
 * Handle incoming webhook data from n8n
 */
export const handleWebhookData = async (webhookData) => {
  const { event, type, action } = webhookData;
  const eventName = event || type || action || "unknown";

  console.log(`Processing webhook event: ${eventName}`);

  // Generic handler - can be extended with more specific logic
  return {
    eventProcessed: true,
    eventType: eventName,
    receivedAt: new Date().toISOString(),
  };
};

/**
 * Verify webhook signature (optional - for security)
 */
export const verifyWebhookSignature = (signature, payload, secret) => {
  if (!secret) {
    console.warn(
      "No webhook secret configured - skipping signature verification",
    );
    return true;
  }

  // Implement signature verification based on your n8n configuration
  // This is a placeholder - adjust based on n8n's signature method
  return true;
};
