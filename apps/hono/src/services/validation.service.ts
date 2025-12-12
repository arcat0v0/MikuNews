import type { ArticlePayload, MediaItem } from "../types";
import { isRecord } from "../utils";

export function validateArticlePayload(input: unknown): ArticlePayload | null {
	if (!isRecord(input)) return null;
	const {
		title,
		id,
		importance,
		color,
		description,
		backgroundImage,
		timestamp,
		author,
		gallery,
		content,
	} = input;

	if (
		typeof title !== "string" ||
		typeof color !== "string" ||
		typeof content !== "string" ||
		typeof timestamp !== "number" ||
		!Number.isFinite(timestamp)
	) {
		return null;
	}

	if (![1, 2, 3, 4].includes(importance as number)) {
		return null;
	}

	if (id !== undefined && typeof id !== "string") {
		return null;
	}

	if (description !== undefined && typeof description !== "string") {
		return null;
	}

	if (backgroundImage !== undefined && typeof backgroundImage !== "string") {
		return null;
	}

	if (author !== undefined && typeof author !== "string") {
		return null;
	}

	let normalizedGallery: MediaItem[] | undefined;
	if (gallery !== undefined) {
		if (!Array.isArray(gallery)) return null;
		normalizedGallery = [];
		for (const raw of gallery) {
			if (!isRecord(raw)) return null;
			if (raw.type !== "image" && raw.type !== "video") return null;
			if (typeof raw.src !== "string") return null;
			const normalized: MediaItem = { type: raw.type, src: raw.src };
			if (raw.alt !== undefined) {
				if (typeof raw.alt !== "string") return null;
				normalized.alt = raw.alt;
			}
			if (raw.poster !== undefined) {
				if (typeof raw.poster !== "string") return null;
				normalized.poster = raw.poster;
			}
			normalizedGallery.push(normalized);
		}
	}

	return {
		title,
		id,
		importance: importance as 1 | 2 | 3 | 4,
		color,
		description,
		backgroundImage,
		timestamp,
		author,
		gallery: normalizedGallery,
		content,
	};
}
