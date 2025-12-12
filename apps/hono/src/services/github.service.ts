import { Buffer } from "node:buffer";
import { App } from "octokit";
import type { Bindings, ArticlePayload } from "../types";
import { buildArticleFileName, buildFrontMatter } from "./article.service";

// Define the file interface to match what the rest of the app expects,
// or map Octokit's response to it.
export interface GitHubFile {
	name: string;
	path: string;
	sha: string;
	size: number;
	url: string;
	html_url: string;
	git_url: string;
	download_url: string;
	type: "file" | "dir";
	content?: string;
	encoding?: string;
	// Extra field to indicate source branch
	branch?: string;
}

export interface GitHubCreateFileResponse {
	content: {
		name?: string;
		path?: string;
		sha?: string;
		size?: number;
		url?: string;
		html_url: string;
		git_url: string;
		download_url: string;
		type?: string;
	} | null;
	commit: {
		sha?: string;
		message?: string;
		html_url?: string;
	};
}

export const BRANCH_BUFFER = "articles-buffer";
export const BRANCH_MAIN = "main";
export const DEFAULT_ARTICLES_PATH = "articles";

// Simple helper to ensure all GitHub commits created by this service use gitmoji
// following the official convention from https://gitmoji.dev/
// Format: `:gitmoji: Commit message`
function withGitmoji(message: string): string {
	const trimmed = message.trim();

	// If the message already starts with a gitmoji code like ":sparkles:",
	// don't add another one.
	if (/^:[a-z0-9_+-]+:/i.test(trimmed)) {
		return trimmed;
	}

	// Use appropriate gitmoji codes for common article operations.
	const patterns: { code: string; regex: RegExp }[] = [
		// :sparkles: new feature / new content
		{ code: ":sparkles:", regex: /^Add article:/i },
		// :memo: editing / writing content
		{ code: ":memo:", regex: /^Update article:/i },
		// :fire: deleting / removing content
		{ code: ":fire:", regex: /^Delete article:/i },
	];

	for (const { code, regex } of patterns) {
		if (regex.test(trimmed)) {
			return `${code} ${trimmed}`;
		}
	}

	// Fallback gitmoji code for other commit messages (official gitmoji).
	const defaultCode = ":memo:";
	return `${defaultCode} ${trimmed}`;
}

/**
 * Initialize GitHub App and get an authenticated Octokit instance for the installation.
 */
async function getOctokit(env: Bindings) {
	// Handle potential newline escaping issues in environment variables
	const privateKey = env.GITHUB_PRIVATE_KEY.replace(/\\n/g, "\n");

	const app = new App({
		appId: env.GITHUB_APP_ID,
		privateKey: privateKey,
	});

	return await app.getInstallationOctokit(Number(env.GITHUB_INSTALLATION_ID));
}

/**
 * List files from a specific branch.
 */
export async function listGitHubFiles(
	env: Bindings,
	branch: string,
	path?: string,
): Promise<GitHubFile[]> {
	const octokit = await getOctokit(env);
	const owner = env.GITHUB_OWNER;
	const repo = env.GITHUB_REPO;
	const articlesPath =
		path || env.GITHUB_ARTICLES_PATH || DEFAULT_ARTICLES_PATH;

	try {
		const { data } = await octokit.rest.repos.getContent({
			owner,
			repo,
			path: articlesPath,
			ref: branch,
		});

		if (!Array.isArray(data)) {
			// This happens if path points to a file instead of a directory
			return [];
		}

		// Map Octokit response to our GitHubFile interface
		return data
			.filter((item) => item.type === "file")
			.map((item) => ({
				name: item.name,
				path: item.path,
				sha: item.sha,
				size: item.size,
				url: item.url,
				html_url: item.html_url || "",
				git_url: item.git_url || "",
				download_url: item.download_url || "",
				type: "file",
				branch: branch,
			}));
	} catch (error: any) {
		// If branch or path doesn't exist, return empty array instead of throwing
		if (error.status === 404) {
			return [];
		}
		console.error(`Error listing GitHub files on branch ${branch}:`, error);
		throw new Error(
			`Failed to list GitHub files on ${branch}: ${error.message || "Unknown error"}`,
		);
	}
}

/**
 * List all articles from both MAIN and BUFFER branches, merging them.
 * Files in BUFFER take precedence (simulate 'staging' status).
 */
export async function listAllArticles(env: Bindings): Promise<GitHubFile[]> {
	const [mainFiles, bufferFiles] = await Promise.all([
		listGitHubFiles(env, BRANCH_MAIN),
		listGitHubFiles(env, BRANCH_BUFFER),
	]);

	// Create a map by filename to merge
	const fileMap = new Map<string, GitHubFile>();

	// Add main files first
	for (const file of mainFiles) {
		fileMap.set(file.name, { ...file, branch: BRANCH_MAIN });
	}

	// Overlay buffer files (they might be new or updates)
	for (const file of bufferFiles) {
		fileMap.set(file.name, { ...file, branch: BRANCH_BUFFER });
	}

	// Return values sorted by name (descending usually makes sense for dates, but let's stick to name)
	return Array.from(fileMap.values()).sort((a, b) =>
		b.name.localeCompare(a.name),
	);
}

/**
 * Get a specific file.
 * If branch is not specified, tries BUFFER first, then MAIN.
 */
export async function getGitHubFile(
	env: Bindings,
	fileName: string,
	branch?: string,
): Promise<GitHubFile> {
	// If branch is specified, fetch directly
	if (branch) {
		return await fetchGitHubFileInternal(env, fileName, branch);
	}

	// Otherwise, try BUFFER then MAIN
	try {
		const bufferFile = await fetchGitHubFileInternal(
			env,
			fileName,
			BRANCH_BUFFER,
		);
		return { ...bufferFile, branch: BRANCH_BUFFER };
	} catch (error: any) {
		// If not found in buffer, try main
		if (error.message.includes("File not found")) {
			try {
				const mainFile = await fetchGitHubFileInternal(
					env,
					fileName,
					BRANCH_MAIN,
				);
				return { ...mainFile, branch: BRANCH_MAIN };
			} catch (e) {
				throw new Error(
					`File not found: ${fileName} (checked ${BRANCH_BUFFER} and ${BRANCH_MAIN})`,
				);
			}
		}
		throw error;
	}
}

async function fetchGitHubFileInternal(
	env: Bindings,
	fileName: string,
	branch: string,
): Promise<GitHubFile> {
	const octokit = await getOctokit(env);
	const owner = env.GITHUB_OWNER;
	const repo = env.GITHUB_REPO;
	const articlesPath = env.GITHUB_ARTICLES_PATH || DEFAULT_ARTICLES_PATH;
	const filePath = `${articlesPath}/${fileName}`;

	try {
		const { data } = await octokit.rest.repos.getContent({
			owner,
			repo,
			path: filePath,
			ref: branch,
		});

		if (Array.isArray(data)) {
			throw new Error("Path points to a directory, expected a file");
		}

		if (data.type !== "file") {
			throw new Error(`Path points to a ${data.type}, expected a file`);
		}

		return {
			name: data.name,
			path: data.path,
			sha: data.sha,
			size: data.size,
			url: data.url,
			html_url: data.html_url || "",
			git_url: data.git_url || "",
			download_url: data.download_url || "",
			type: "file",
			content: data.content,
			encoding: data.encoding,
			branch: branch,
		};
	} catch (error: any) {
		if (error.status === 404) {
			throw new Error(`File not found: ${fileName}`);
		}
		throw new Error(
			`Failed to get GitHub file: ${error.message || "Unknown error"}`,
		);
	}
}

export async function createOrUpdateGitHubFile(
	env: Bindings,
	fileName: string,
	content: string,
	message: string,
	branch: string,
	sha?: string,
): Promise<GitHubCreateFileResponse> {
	const octokit = await getOctokit(env);
	const owner = env.GITHUB_OWNER;
	const repo = env.GITHUB_REPO;
	const articlesPath = env.GITHUB_ARTICLES_PATH || DEFAULT_ARTICLES_PATH;
	const filePath = `${articlesPath}/${fileName}`;

	// Octokit expects content in Base64
	const contentBase64 = Buffer.from(content).toString("base64");
	const commitMessage = withGitmoji(message);

	try {
		const { data } = await octokit.rest.repos.createOrUpdateFileContents({
			owner,
			repo,
			path: filePath,
			message: commitMessage,
			content: contentBase64,
			branch,
			sha, // Required if updating existing file IN THAT BRANCH
		});

		return {
			content: data.content
				? {
						name: data.content.name,
						path: data.content.path,
						sha: data.content.sha,
						size: data.content.size,
						url: data.content.url,
						html_url: data.content.html_url || "",
						git_url: data.content.git_url || "",
						download_url: data.content.download_url || "",
						type: data.content.type,
					}
				: null,
			commit: {
				sha: data.commit.sha,
				message: data.commit.message,
				html_url: data.commit.html_url,
			},
		};
	} catch (error: any) {
		console.error("Error creating/updating GitHub file:", error);
		throw new Error(
			`Failed to create/update GitHub file: ${error.message || "Unknown error"}`,
		);
	}
}

export async function deleteGitHubFile(
	env: Bindings,
	fileName: string,
	sha: string,
	message: string,
	branch: string = BRANCH_BUFFER,
): Promise<void> {
	const octokit = await getOctokit(env);
	const owner = env.GITHUB_OWNER;
	const repo = env.GITHUB_REPO;
	const articlesPath = env.GITHUB_ARTICLES_PATH || DEFAULT_ARTICLES_PATH;
	const filePath = `${articlesPath}/${fileName}`;

	const commitMessage = withGitmoji(message);

	try {
		await octokit.rest.repos.deleteFile({
			owner,
			repo,
			path: filePath,
			message: commitMessage,
			sha,
			branch,
		});
	} catch (error: any) {
		console.error("Error deleting GitHub file:", error);
		throw new Error(
			`Failed to delete GitHub file: ${error.message || "Unknown error"}`,
		);
	}
}

export async function pushArticleToGitHub(
	env: Bindings,
	article: ArticlePayload,
): Promise<string> {
	const fileName = buildArticleFileName(article);

	const frontMatter = buildFrontMatter(article);
	const content = `${frontMatter}\n\n${article.content.trim()}\n`;

	const message = `Add article: ${article.title}`;

	try {
		// ALWAYS check BUFFER branch for existence.
		// We do not care if it exists in MAIN, because we are pushing to BUFFER.
		let sha: string | undefined;
		try {
			const existingFile = await fetchGitHubFileInternal(
				env,
				fileName,
				BRANCH_BUFFER,
			);
			sha = existingFile.sha;
		} catch (e: any) {
			// Not found in buffer -> it's a new file (for buffer branch)
		}

		await createOrUpdateGitHubFile(
			env,
			fileName,
			content,
			sha ? `Update article: ${article.title}` : message,
			BRANCH_BUFFER,
			sha,
		);
	} catch (error) {
		console.error("Critical error pushing article to GitHub:", error);
		throw error;
	}

	return fileName;
}
