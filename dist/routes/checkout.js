"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = require("../lib/stripe");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post("/create", auth_1.authenticateUser, async (req, res) => {
    const { priceId } = req.body;
    const user = req.user;
    if (!priceId) {
        return res.status(400).json({ error: "Missing priceId" });
    }
    try {
        // Check if customer already exists
        const { data: existingCustomers } = await stripe_1.stripe.customers.list({
            email: user.email,
            limit: 1,
        });
        let customerId;
        if (existingCustomers.length > 0) {
            customerId = existingCustomers[0].id;
        }
        const sessionParams = {
            metadata: { user_id: user.id },
            line_items: [{ price: priceId, quantity: 1 }],
            mode: "subscription",
            success_url: `${process.env.APP_URL}/settings?success=true`,
            cancel_url: `${process.env.APP_URL}/settings?canceled=true`,
        };
        if (customerId) {
            sessionParams.customer = customerId;
        }
        else {
            sessionParams.customer_email = user.email;
        }
        const session = await stripe_1.stripe.checkout.sessions.create(sessionParams);
        res.json({ url: session.url });
    }
    catch (error) {
        console.error("Checkout error:", error);
        res.status(500).json({
            error: "Failed to create checkout session",
        });
    }
});
exports.default = router;
