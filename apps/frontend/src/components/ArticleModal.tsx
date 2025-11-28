import { ModalContainer } from "./ModalContainer";
import { ArticleCard } from "./ArticleCard";
import type { MediaItem } from "../utils/articleParser";

export interface ArticleModalProps {
	content: string;
	title?: string;
	author?: string;
	timestamp?: number;
	gallery?: MediaItem[];
	isOpen: boolean;
	onClose: () => void;
	originRect: DOMRect | null;
}

export const ArticleModal = ({
	content,
	title,
	author,
	timestamp,
	gallery,
	isOpen,
	onClose,
	originRect,
}: ArticleModalProps) => {
	return (
		<ModalContainer isOpen={isOpen} onClose={onClose} originRect={originRect}>
			<ArticleCard
				content={content}
				title={title}
				author={author}
				timestamp={timestamp}
				gallery={gallery}
				className="shadow-2xl min-h-full"
			/>
		</ModalContainer>
	);
};
