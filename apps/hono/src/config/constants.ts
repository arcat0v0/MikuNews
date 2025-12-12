import { resolve } from "node:path";

const maybeProcess = (globalThis as any).process as
	| { cwd: () => string }
	| undefined;

export const defaultArticlesDir =
	maybeProcess && typeof maybeProcess.cwd === "function"
		? resolve(maybeProcess.cwd(), "../../articles")
		: "/articles";
