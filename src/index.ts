import "dotenv/config";
import express from "express";
import cors from "cors";

import checkoutRoutes from "./routes/checkout";
import webhookRoutes from "./routes/webhook";
import billingRoutes from "./routes/billing";
import usageRoutes from "./routes/usage";

import "dotenv/config";

// Debug: Log which env vars are present (not their values)
console.log("Environment check:", {
    PORT: !!process.env.PORT,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    APP_URL: !!process.env.APP_URL,
    ALLOWED_ORIGINS: !!process.env.ALLOWED_ORIGINS,
});

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    }),
);

// Webhook route needs raw body for signature verification
app.use("/webhook", express.raw({ type: "application/json" }), webhookRoutes);

// All other routes use JSON parsing
app.use(express.json());

// Health check
app.get("/", (req, res) => {
    res.json({ status: "ok", service: "autofill-api" });
});

// Routes
app.use("/checkout", checkoutRoutes);
app.use("/billing", billingRoutes);
app.use("/usage", usageRoutes);

// Error handler
app.use(
    (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) => {
        console.error("Unhandled error:", err);
        res.status(500).json({ error: "Internal server error" });
    },
);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`API running on port ${PORT}`);
});
