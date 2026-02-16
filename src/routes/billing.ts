import { Router, Request, Response } from "express";
import { stripe } from "../lib/stripe";
import { getSupabase } from "../lib/supabase";

const router = Router();
const supabase = getSupabase();
import { authenticateUser } from "../middleware/auth";

router.post(
    "/portal",
    authenticateUser,
    async (req: Request, res: Response) => {
        const user = req.user!;

        try {
            // Get subscription with customer ID
            const { data: subscription, error } = await supabase
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

            const portalSession = await stripe.billingPortal.sessions.create({
                customer: subscription.customer_id,
                return_url: `${process.env.APP_URL}/settings`,
            });

            res.json({ url: portalSession.url });
        } catch (error) {
            console.error("Portal error:", error);
            res.status(500).json({ error: "Failed to create portal session" });
        }
    },
);

// Get subscription status
router.get("/status", authenticateUser, async (req: Request, res: Response) => {
    const user = req.user!;

    try {
        const { data: subscription } = await supabase
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
    } catch (error) {
        console.error("Status error:", error);
        res.status(500).json({ error: "Failed to get subscription status" });
    }
});

export default router;
