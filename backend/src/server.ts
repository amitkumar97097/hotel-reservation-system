import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

async function startServer(): Promise<void> {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.info(`Hotel Reservation API listening on http://localhost:${env.PORT}`);
    console.info(`Health check: http://localhost:${env.PORT}/api/v1/health`);
  });

  let shuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    console.info(`${signal} received. Shutting down gracefully...`);

    server.close(async (error) => {
      try {
        await disconnectDatabase();

        if (error) {
          console.error("HTTP server shutdown error:", error);
          process.exitCode = 1;
        }
      } catch (disconnectError) {
        console.error("Database shutdown error:", disconnectError);
        process.exitCode = 1;
      }
    });
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

startServer().catch((error: unknown) => {
  console.error("Failed to start the application:", error);
  process.exitCode = 1;
});
