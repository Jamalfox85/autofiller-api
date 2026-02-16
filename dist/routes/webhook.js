"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = require("../lib/stripe");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
        return res.status(400).json({ error: "Missing signature" });
    }
    let event;
    try {
        event = stripe_1.stripe.webhooks.constructEvent(req.body, // Raw body
        signature, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).json({ error: "Invalid signature" });
    }
    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                if (session.subscription && session.metadata?.user_id) {
                    const subscription = await stripe_1.stripe.subscriptions.retrieve(session.subscription);
                    // Store customer ID for future portal sessions
                    await supabase_1.supabase.from("subscriptions").upsert({
                        id: subscription.id,
                        user_id: session.metadata.user_id,
                        customer_id: subscription.customer,
                        status: subscription.status,
                        plan: "pro",
                        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        cancel_at_period_end: subscription.cancel_at_period_end,
                    });
                    console.log(`Subscription created for user ${session.metadata.user_id}`);
                }
                break;
            }
            case "customer.subscription.updated": {
                const subscription = event.data.object;
                const { error } = await supabase_1.supabase
                    .from("subscriptions")
                    .update({
                    status: subscription.status,
                    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancel_at_period_end: subscription.cancel_at_period_end,
                    updated_at: new Date().toISOString(),
                })
                    .eq("id", subscription.id);
                if (error) {
                    console.error("Failed to update subscription:", error);
                }
                else {
                    console.log(`Subscription ${subscription.id} updated to ${subscription.status}`);
                }
                break;
            }
            case "customer.subscription.deleted": {
                const subscription = event.data.object;
                const { error } = await supabase_1.supabase
                    .from("subscriptions")
                    .update({
                    status: "canceled",
                    updated_at: new Date().toISOString(),
                })
                    .eq("id", subscription.id);
                if (error) {
                    console.error("Failed to cancel subscription:", error);
                }
                else {
                    console.log(`Subscription ${subscription.id} canceled`);
                }
                break;
            }
            case "invoice.payment_failed": {
                const invoice = event.data.object;
                console.log(`Payment failed for invoice ${invoice.id}`);
                // Optionally notify user or update status
                break;
            }
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).json({ error: "Webhook processing failed" });
    }
});
exports.default = router;
