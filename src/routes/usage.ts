import { Router, Request, Response } from "express";
import { getSupabase } from "../lib/supabase";

const router = Router();
const supabase = getSupabase();
import { authenticateUser } from "../middleware/auth";

function getPeriodStart(): string {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date.toISOString().split("T")[0];
}

// Get current usage and limits
router.get("/", authenticateUser, async (req: Request, res: Response) => {
    const user = req.user!;
    const periodStart = getPeriodStart();

    try {
        // Get subscription
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("plan")
            .eq("user_id", user.id)
            .eq("status", "active")
            .single();

        const plan = subscription?.plan || "free";

        // Get usage
        const { data: usageData } = await supabase
            .from("usage")
            .select("applications_count, custom_responses_count")
            .eq("user_id", user.id)
            .eq("period_start", periodStart)
            .single();

        res.json({
            plan,
            isPro: plan === "pro",
            usage: {
                applications: usageData?.applications_count || 0,
                customResponses: usageData?.custom_responses_count || 0,
            },
            limits: {
                applications: plan === "pro" ? null : 50,
                customResponses: plan === "pro" ? null : 2,
            },
            periodStart,
        });
    } catch (error) {
        console.error("Usage fetch error:", error);
        res.status(500).json({ error: "Failed to fetch usage" });
    }
});

// Check if action is allowed (without incrementing)
router.get(
    "/check/:field",
    authenticateUser,
    async (req: Request, res: Response) => {
        const user = req.user!;
        const field = req.params.field as string;

        if (!["applications", "custom_responses"].includes(field)) {
            return res.status(400).json({ error: "Invalid field" });
        }

        try {
            const { data, error } = await supabase.rpc("increment_usage", {
                p_user_id: user.id,
                p_field: field,
                p_dry_run: true, // We'll add this parameter to the function
            });

            if (error) throw error;

            res.json(data);
        } catch (error) {
            console.error("Usage check error:", error);
            res.status(500).json({ error: "Failed to check usage" });
        }
    },
);

// Increment usage
router.post(
    "/increment",
    authenticateUser,
    async (req: Request, res: Response) => {
        const user = req.user!;
        const { field } = req.body;

        if (!["applications", "custom_responses"].includes(field)) {
            return res.status(400).json({ error: "Invalid field" });
        }

        try {
            const { data, error } = await supabase.rpc("increment_usage", {
                p_user_id: user.id,
                p_field: field,
            });

            if (error) throw error;

            res.json(data);
        } catch (error) {
            console.error("Usage increment error:", error);
            res.status(500).json({ error: "Failed to increment usage" });
        }
    },
);

export default router;
