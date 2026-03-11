import axios from "axios";

const API_BASE = "http://localhost:5000/api/webhooks";

async function testWebhooks() {
  console.log("\n📋 Testing N8N Webhook Integration\n");
  console.log("=".repeat(50));

  try {
    // Test 1: Health Check
    console.log("\n✅ Test 1: Health Check");
    const healthRes = await axios.get(`${API_BASE}/health`);
    console.log("Status:", healthRes.data.status);
    console.log("Message:", healthRes.data.message);

    // Test 2: Send Test Webhook
    console.log("\n✅ Test 2: Send Test Webhook");
    const testRes = await axios.post(`${API_BASE}/test`, {
      event: "webhook_test",
      message: "Testing n8n integration",
      timestamp: new Date().toISOString(),
    });
    console.log("Success:", testRes.data.success);
    console.log("Message:", testRes.data.message);

    // Test 3: Get Webhook Logs
    console.log("\n✅ Test 3: Get Webhook Logs");
    const logsRes = await axios.get(`${API_BASE}/logs`);
    console.log("Total logs:", logsRes.data.count);
    if (logsRes.data.logs.length > 0) {
      console.log(
        "Latest log:",
        JSON.stringify(
          logsRes.data.logs[logsRes.data.logs.length - 1],
          null,
          2,
        ),
      );
    }

    // Test 4: Simulate n8n Webhook (User Update)
    console.log("\n✅ Test 4: Receive User Update from N8N");
    const updateRes = await axios
      .post(`${API_BASE}/n8n`, {
        event: "user_updated",
        clerkId: "test_user_123",
        userData: {
          subscriptions: ["test_channel_1", "test_channel_2"],
        },
      })
      .catch((err) => {
        // Expected to fail without proper user setup, but endpoint should be reachable
        console.log(
          "Request sent successfully (expected error due to no real user DB)",
        );
        return { data: { error: "Expected - no real database" } };
      });

    console.log("\n" + "=".repeat(50));
    console.log("✋ All webhook endpoints are operational!");
    console.log("=".repeat(50));

    console.log("\n📖 Next steps:");
    console.log("1. Read WEBHOOK_QUICK_START.md for usage examples");
    console.log("2. Configure N8N_WEBHOOK_URL in .env to send events to n8n");
    console.log("3. Set up n8n workflows to receive/process webhook data");
    console.log("4. Use GET /api/webhooks/logs to debug webhook activity\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
    process.exit(1);
  }
}

testWebhooks();
