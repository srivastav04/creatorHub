import * as userService from "../services/user.service.js";
import {
  logWebhookEvent,
  handleWebhookData,
  getWebhookLogs as getLogsFromService,
} from "../services/webhook.service.js";

/**
 * Receive and process webhooks from n8n
 */
export const receiveN8nWebhook = async (req, res) => {
  try {
    const webhookData = req.body;

    // Log the incoming webhook
    console.log("N8N Webhook Received:", webhookData);
    logWebhookEvent("incoming", webhookData);

    if (!webhookData) {
      return res.status(400).json({ error: "Webhook body is empty" });
    }

    // Process the webhook data based on event type
    const eventType = webhookData.event || webhookData.type;

    let result;
    switch (eventType) {
      case "user_updated":
        result = await handleUserUpdate(webhookData);
        break;
      case "subscriptions_changed":
        result = await handleSubscriptionChange(webhookData);
        break;
      case "data_sync":
        result = await handleDataSync(webhookData);
        break;
      case "automation_trigger":
        result = await handleAutomationTrigger(webhookData);
        break;
      default:
        result = await handleWebhookData(webhookData);
    }

    res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      result,
    });
  } catch (error) {
    console.error("Error processing n8n webhook:", error);
    logWebhookEvent("error", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      error: "Failed to process webhook",
      message: error.message,
    });
  }
};

/**
 * Handle user update webhook from n8n
 */
const handleUserUpdate = async (data) => {
  const { clerkId, userData } = data;

  if (!clerkId) {
    throw new Error("Missing clerkId in user update webhook");
  }

  try {
    const updatedUser = userService.updateUserData(clerkId, userData);
    console.log("User updated via webhook:", clerkId);
    return { updatedUser, action: "user_updated" };
  } catch (error) {
    console.error("Error updating user from webhook:", error);
    throw error;
  }
};

/**
 * Handle subscription changes from n8n
 */
const handleSubscriptionChange = async (data) => {
  const { clerkId, subscriptions } = data;

  if (!clerkId || !Array.isArray(subscriptions)) {
    throw new Error("Missing clerkId or invalid subscriptions array");
  }

  try {
    const user = userService.updateUserData(clerkId, { subscriptions });
    console.log("Subscriptions updated via webhook:", clerkId);
    return { user, action: "subscriptions_updated" };
  } catch (error) {
    console.error("Error updating subscriptions from webhook:", error);
    throw error;
  }
};

/**
 * Handle full data sync from n8n
 */
const handleDataSync = async (data) => {
  const { clerkId, history, likedVideos, playlists, subscriptions } = data;

  if (!clerkId) {
    throw new Error("Missing clerkId in data sync webhook");
  }

  try {
    const updatedUser = userService.updateUserData(clerkId, {
      history,
      likedVideos,
      playlists,
      subscriptions,
    });
    console.log("Full data sync via webhook:", clerkId);
    return { updatedUser, action: "data_synced" };
  } catch (error) {
    console.error("Error syncing data from webhook:", error);
    throw error;
  }
};

/**
 * Handle automation triggers from n8n
 */
const handleAutomationTrigger = async (data) => {
  const { action, payload } = data;

  console.log("Automation trigger received:", action);

  // You can add custom automation logic here
  // For now, we'll just log and return success
  return {
    action,
    processed: true,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Health check endpoint - n8n can use this to verify connectivity
 */
export const webhookHealthCheck = (req, res) => {
  res.status(200).json({
    status: "healthy",
    message: "N8N webhook receiver is operational",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Get webhook logs for debugging
 */
export const getWebhookLogs = (req, res) => {
  try {
    const logs = getLogsFromService();
    res.status(200).json({
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Error fetching webhook logs:", error);
    res.status(500).json({ error: "Failed to fetch webhook logs" });
  }
};
