import { Hono } from "hono";
import type { Bindings } from "./types";
import {
	registerHealthRoute,
	registerSubmitRoute,
	registerTelegramRoute,
	registerArticlesRoute,
	githubRoutes,
} from "./routes";

const app = new Hono<{ Bindings: Bindings }>();

// Register all routes
registerHealthRoute(app);
registerSubmitRoute(app);
registerTelegramRoute(app);
registerArticlesRoute(app);
app.route("/github", githubRoutes);

export default app;
