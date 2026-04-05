import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { errorHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import recordRoutes from "./routes/records.js";
import summaryRoutes from "./routes/summary.js";
import { env } from "./config/env.js";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins.length > 0 ? env.corsOrigins : env.isProd ? false : true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ success: true, status: "ok" });
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false
  });

  if (!env.isProd || env.enableDocs) {
    app.use(
      "/docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        swaggerOptions: {
          persistAuthorization: true,
          requestInterceptor: (req: any) => {
            try {
              if (req?.body && typeof req.body === "string") {
                req.body = req.body.replace(/\{ts\}/g, String(Date.now()));
              }
            } catch {
              // no-op
            }
            return req;
          }
        }
      })
    );
  }

  app.use("/auth", authLimiter, authRoutes);
  app.use("/users", userRoutes);
  app.use("/records", recordRoutes);
  app.use("/summary", summaryRoutes);

  app.use(errorHandler);

  return app;
};
