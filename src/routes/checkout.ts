import { Router, Request, Response } from "express";
import { stripe } from "../lib/stripe";
import { authenticateUser } from "../middleware/auth";

const router = Router();

router.post(
    "/create",
    authenticateUser,
    async (req: Request, res: Response) => {
        const { priceId } = req.body;
        const user = req.user!;

        if (!priceId) {
            return res.status(400).json({ error: "Missing priceId" });
        }

        try {
            // Check if customer already exists
            const { data: existingCustomers } = await stripe.customers.list({
                email: user.email,
                limit: 1,
            });

            let customerId: string | undefined;

            if (existingCustomers.length > 0) {
                customerId = existingCustomers[0].id;
            }

            const sessionParams: any = {
                metadata: { user_id: user.id },
                line_items: [{ price: priceId, quantity: 1 }],
                mode: "subscription",
                success_url: `${process.env.APP_URL}/settings?success=true`,
                cancel_url: `${process.env.APP_URL}/settings?canceled=true`,
            };

            if (customerId) {
                sessionParams.customer = customerId;
            } else {
                sessionParams.customer_email = user.email;
            }

            const session =
                await stripe.checkout.sessions.create(sessionParams);

            res.json({ url: session.url });
        } catch (error) {
            console.error("Checkout error:", error);
            res.status(500).json({
                error: "Failed to create checkout session",
            });
        }
    },
);

export default router;
