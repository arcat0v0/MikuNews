const DEFAULT_TITLE = "MikuNews";
const DEFAULT_DESCRIPTION = "MikuNews - 聚合热点资讯与深度解读的新闻平台。";
const DEFAULT_SITE_NAME = "MikuNews";

export type SeoArticleInput = {
	id?: string;
	slug?: string;
	title?: string;
	description?: string;
	content?: string;
	author?: string;
	timestamp?: number;
	backgroundImage?: string;
	gallery?: { type: "image" | "video"; src: string; poster?: string }[];
};

type SeoConfig = {
	title: string;
	description: string;
	url: string;
	type: "website" | "article";
	image?: string;
	publishedTime?: string;
	author?: string;
	structuredData?: Record<string, unknown>;
};

const getOrCreateMeta = (selector: string, create: () => HTMLMetaElement) => {
	const existing = document.head.querySelector<HTMLMetaElement>(selector);
	if (existing) return existing;
	const meta = create();
	document.head.appendChild(meta);
	return meta;
};

const setMetaTag = (name: string, content?: string) => {
	const selector = `meta[name="${name}"]`;
	if (!content) {
		const existing = document.head.querySelector(selector);
		existing?.remove();
		return;
	}
	const meta = getOrCreateMeta(selector, () => {
		const tag = document.createElement("meta");
		tag.setAttribute("name", name);
		return tag;
	});
	meta.setAttribute("content", content);
};

const setMetaProperty = (property: string, content?: string) => {
	const selector = `meta[property="${property}"]`;
	if (!content) {
		const existing = document.head.querySelector(selector);
		existing?.remove();
		return;
	}
	const meta = getOrCreateMeta(selector, () => {
		const tag = document.createElement("meta");
		tag.setAttribute("property", property);
		return tag;
	});
	meta.setAttribute("content", content);
};

const setLinkTag = (rel: string, href?: string) => {
	const selector = `link[rel="${rel}"]`;
	if (!href) {
		const existing = document.head.querySelector(selector);
		existing?.remove();
		return;
	}
	const link = document.head.querySelector<HTMLLinkElement>(selector) ??
		(() => {
			const tag = document.createElement("link");
			tag.setAttribute("rel", rel);
			document.head.appendChild(tag);
			return tag;
		})();
	link.setAttribute("href", href);
};

const setJsonLd = (data?: Record<string, unknown>) => {
	const id = "mikunews-structured-data";
	const existing = document.head.querySelector<HTMLScriptElement>(
		`script#${id}`,
	);
	if (!data) {
		existing?.remove();
		return;
	}
	const script = existing ?? document.createElement("script");
	script.type = "application/ld+json";
	script.id = id;
	script.text = JSON.stringify(data);
	if (!existing) {
		document.head.appendChild(script);
	}
};

const toAbsoluteUrl = (url?: string) => {
	if (!url) return undefined;
	try {
		if (url.startsWith("http://") || url.startsWith("https://")) return url;
		if (url.startsWith("//")) {
			return `${window.location.protocol}${url}`;
		}
		return new URL(url, window.location.origin).toString();
	} catch {
		return undefined;
	}
};

const stripMarkdown = (input: string) => {
	return input
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`[^`]*`/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.replace(/[#*_>\-]+/g, " ")
		.replace(/\r?\n/g, " ")
		.replace(/\s+/g, " ")
		.trim();
};

const buildDescription = (input?: string) => {
	if (!input) return DEFAULT_DESCRIPTION;
	const text = stripMarkdown(input);
	if (!text) return DEFAULT_DESCRIPTION;
	return text.length > 160 ? `${text.slice(0, 157)}...` : text;
};

const pickImage = (article?: SeoArticleInput) => {
	const fromBackground = toAbsoluteUrl(article?.backgroundImage);
	if (fromBackground) return fromBackground;
	const gallery = article?.gallery ?? [];
	for (const item of gallery) {
		if (item.type === "image") {
			const abs = toAbsoluteUrl(item.src);
			if (abs) return abs;
		}
		if (item.type === "video") {
			const poster = toAbsoluteUrl(item.poster);
			if (poster) return poster;
		}
	}
	return undefined;
};

const compact = <T extends Record<string, unknown>>(obj: T) => {
	return Object.fromEntries(
		Object.entries(obj).filter(([, value]) => value !== undefined),
	) as T;
};

export const buildWebsiteSeo = (url: string, overrides?: Partial<SeoConfig>) => {
	const description = overrides?.description ?? DEFAULT_DESCRIPTION;
	return {
		title: overrides?.title ?? DEFAULT_TITLE,
		description,
		url,
		type: "website" as const,
		image: overrides?.image,
		structuredData: compact({
			"@context": "https://schema.org",
			"@type": "WebSite",
			name: DEFAULT_SITE_NAME,
			url,
			description,
		}),
	};
};

export const buildArticleSeo = (
	url: string,
	article: SeoArticleInput,
) => {
	const description = buildDescription(
		article.description || article.content || DEFAULT_DESCRIPTION,
	);
	const image = pickImage(article);
	const isoTime = article.timestamp
		? new Date(article.timestamp).toISOString()
		: undefined;

	return {
		title: article.title
			? `${article.title} - ${DEFAULT_TITLE}`
			: DEFAULT_TITLE,
		description,
		url,
		type: "article" as const,
		image,
		publishedTime: isoTime,
		author: article.author,
		structuredData: compact({
			"@context": "https://schema.org",
			"@type": "NewsArticle",
			headline: article.title,
			description,
			image: image ? [image] : undefined,
			datePublished: isoTime,
			dateModified: isoTime,
			author: article.author
				? {
					"@type": "Person",
					name: article.author,
				}
				: undefined,
			mainEntityOfPage: {
				"@type": "WebPage",
				"@id": url,
			},
			publisher: {
				"@type": "Organization",
				name: DEFAULT_SITE_NAME,
				logo: {
					"@type": "ImageObject",
					url: toAbsoluteUrl("/MikuNews.svg"),
				},
			},
		}),
	};
};

export const applySeo = (config: SeoConfig) => {
	document.title = config.title;

	setMetaTag("description", config.description);
	setMetaTag("robots", "index,follow");
	setMetaTag("twitter:card", config.image ? "summary_large_image" : "summary");
	setMetaTag("twitter:title", config.title);
	setMetaTag("twitter:description", config.description);
	setMetaTag("twitter:image", config.image);

	setMetaProperty("og:site_name", DEFAULT_SITE_NAME);
	setMetaProperty("og:title", config.title);
	setMetaProperty("og:description", config.description);
	setMetaProperty("og:url", config.url);
	setMetaProperty("og:type", config.type);
	setMetaProperty("og:image", config.image);
	setMetaProperty("og:locale", "zh_CN");

	setMetaProperty("article:published_time", config.publishedTime);
	setMetaProperty("article:author", config.author);

	setLinkTag("canonical", config.url);
	setJsonLd(config.structuredData);
};

export const getDefaultDescription = () => DEFAULT_DESCRIPTION;
