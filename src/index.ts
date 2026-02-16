import "dotenv/config";
import express from "express";
import cors from "cors";

import checkoutRoutes from "./routes/checkout";
import webhookRoutes from "./routes/webhook";
import billingRoutes from "./routes/billing";
import usageRoutes from "./routes/usage";

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
});
