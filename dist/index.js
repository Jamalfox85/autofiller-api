"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const checkout_1 = __importDefault(require("./routes/checkout"));
const webhook_1 = __importDefault(require("./routes/webhook"));
const billing_1 = __importDefault(require("./routes/billing"));
const usage_1 = __importDefault(require("./routes/usage"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));
// Webhook route needs raw body for signature verification
app.use("/webhook", express_1.default.raw({ type: "application/json" }), webhook_1.default);
// All other routes use JSON parsing
app.use(express_1.default.json());
// Health check
app.get("/", (req, res) => {
    res.json({ status: "ok", service: "autofill-api" });
});
// Routes
app.use("/checkout", checkout_1.default);
app.use("/billing", billing_1.default);
app.use("/usage", usage_1.default);
// Error handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});
app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
});
