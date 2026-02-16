// import "dotenv/config";
// import express from "express";
// import cors from "cors";

// import checkoutRoutes from "./routes/checkout";
// import webhookRoutes from "./routes/webhook";
// import billingRoutes from "./routes/billing";
// import usageRoutes from "./routes/usage";

// const app = express();
// const PORT = parseInt(process.env.PORT || "3000", 10);

// // CORS configuration
// const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
// app.use(
//     cors({
//         origin: (origin, callback) => {
//             // Allow requests with no origin (like mobile apps or curl)
//             if (!origin) return callback(null, true);

//             if (allowedOrigins.includes(origin)) {
//                 callback(null, true);
//             } else {
//                 callback(new Error("Not allowed by CORS"));
//             }
//         },
//         credentials: true,
//     }),
// );

// // Webhook route needs raw body for signature verification
// app.use("/webhook", express.raw({ type: "application/json" }), webhookRoutes);

// // All other routes use JSON parsing
// app.use(express.json());

// // Health check
// app.get("/", (req, res) => {
//     res.json({ status: "ok", service: "autofill-api" });
// });

// // Routes
// app.use("/checkout", checkoutRoutes);
// app.use("/billing", billingRoutes);
// app.use("/usage", usageRoutes);

// // Error handler
// app.use(
//     (
//         err: Error,
//         req: express.Request,
//         res: express.Response,
//         next: express.NextFunction,
//     ) => {
//         console.error("Unhandled error:", err);
//         res.status(500).json({ error: "Internal server error" });
//     },
// );

// app.listen(PORT, "0.0.0.0", () => {
//     console.log(`API running on port ${PORT}`);
// });

import express from "express";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.get("/", (req, res) => {
    res.json({ status: "ok" });
});

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Running on port ${PORT}`);
});

// Keep the process alive
process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully");
    server.close(() => {
        console.log("Server closed");
        process.exit(0);
    });
});
