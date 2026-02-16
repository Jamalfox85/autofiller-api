"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = require("../lib/stripe");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post("/portal", auth_1.authenticateUser, async (req, res) => {
    const user = req.user;
    try {
        // Get subscription with customer ID
        const { data: subscription, error } = await supabase_1.supabase
            .from("subscriptions")
            .select("customer_id")
            .eq("user_id", user.id)
            .in("status", ["active", "past_due", "trialing"])
            .single();
        if (error || !subscription?.customer_id) {
            return res
                .status(404)
                .json({ error: "No active subscription found" });
        }
        const portalSession = await stripe_1.stripe.billingPortal.sessions.create({
            customer: subscription.customer_id,
            return_url: `${process.env.APP_URL}/settings`,
        });
        res.json({ url: portalSession.url });
    }
    catch (error) {
        console.error("Portal error:", error);
        res.status(500).json({ error: "Failed to create portal session" });
    }
});
// Get subscription status
router.get("/status", auth_1.authenticateUser, async (req, res) => {
    const user = req.user;
    try {
        const { data: subscription } = await supabase_1.supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .in("status", ["active", "past_due", "trialing"])
            .single();
        if (!subscription) {
            return res.json({
                plan: "free",
                isPro: false,
                subscription: null,
            });
        }
        res.json({
            plan: subscription.plan,
            isPro: subscription.plan === "pro",
            subscription: {
                status: subscription.status,
                currentPeriodEnd: subscription.current_period_end,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
        });
    }
    catch (error) {
        console.error("Status error:", error);
        res.status(500).json({ error: "Failed to get subscription status" });
    }
});
exports.default = router;
