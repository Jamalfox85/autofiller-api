import { Router, Request, Response } from "express";
import { stripe } from "../lib/stripe";
import { supabase } from "../lib/supabase";
import Stripe from "stripe";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature) {
        return res.status(400).json({ error: "Missing signature" });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body, // Raw body
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!,
        );
    } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).json({ error: "Invalid signature" });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                if (session.subscription && session.metadata?.user_id) {
                    const subscription = await stripe.subscriptions.retrieve(
                        session.subscription as string,
                    );

                    // Store customer ID for future portal sessions
                    await supabase.from("subscriptions").upsert({
                        id: subscription.id,
                        user_id: session.metadata.user_id,
                        customer_id: subscription.customer as string,
                        status: subscription.status,
                        plan: "pro",
                        current_period_start: new Date(
                            (subscription as any).current_period_start * 1000,
                        ).toISOString(),
                        current_period_end: new Date(
                            (subscription as any).current_period_end * 1000,
                        ).toISOString(),
                        cancel_at_period_end: subscription.cancel_at_period_end,
                    });

                    console.log(
                        `Subscription created for user ${session.metadata.user_id}`,
                    );
                }
                break;
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;

                const { error } = await supabase
                    .from("subscriptions")
                    .update({
                        status: subscription.status,
                        current_period_start: new Date(
                            (subscription as any).current_period_start * 1000,
                        ).toISOString(),
                        current_period_end: new Date(
                            (subscription as any).current_period_end * 1000,
                        ).toISOString(),
                        cancel_at_period_end: subscription.cancel_at_period_end,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", subscription.id);

                if (error) {
                    console.error("Failed to update subscription:", error);
                } else {
                    console.log(
                        `Subscription ${subscription.id} updated to ${subscription.status}`,
                    );
                }
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;

                const { error } = await supabase
                    .from("subscriptions")
                    .update({
                        status: "canceled",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", subscription.id);

                if (error) {
                    console.error("Failed to cancel subscription:", error);
                } else {
                    console.log(`Subscription ${subscription.id} canceled`);
                }
                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                console.log(`Payment failed for invoice ${invoice.id}`);
                // Optionally notify user or update status
                break;
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).json({ error: "Webhook processing failed" });
    }
});

export default router;
