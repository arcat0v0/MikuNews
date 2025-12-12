export type MediaItem = {
	type: "image" | "video";
	src: string;
	alt?: string;
	poster?: string;
};

export type ArticleImportance = 1 | 2 | 3 | 4;

export interface ArticleMetadata {
	title: string;
	importance: ArticleImportance;
	color: string;
	description?: string;
	backgroundImage?: string;
	timestamp: number;
	author?: string;
	gallery?: MediaItem[];
	isTop?: boolean;
	useNineGrid?: boolean;
	id?: string;
}

export interface ArticleFrontMatter extends ArticleMetadata {
	id: string;
}

export interface Article extends ArticleFrontMatter {
	content: string;
	slug: string;
}

export type ArticlePayload = ArticleMetadata & {
	content: string;
};
