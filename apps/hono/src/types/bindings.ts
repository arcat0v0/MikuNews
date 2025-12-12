export type Bindings = {
	TELEGRAM_BOT_TOKEN: string;
	TELEGRAM_REVIEWER_ID: string;
	TELEGRAM_WEBHOOK_SECRET?: string;
	ARTICLES_DIR?: string;
	// GitHub App Configuration
	GITHUB_APP_ID: string;
	GITHUB_PRIVATE_KEY: string;
	GITHUB_INSTALLATION_ID: string;
	// Target Repository Info
	GITHUB_OWNER: string;
	GITHUB_REPO: string;
	GITHUB_BRANCH?: string;
	GITHUB_ARTICLES_PATH?: string;
	// KV Storage
	MikuNewsKV?: KVNamespace;
};
