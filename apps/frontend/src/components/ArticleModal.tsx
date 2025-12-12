import type { MediaItem } from "@mikunews/models";
import { ModalContainer } from "./ModalContainer";
import { ArticleCard } from "./ArticleCard";

export interface ArticleModalProps {
	content: string;
	title?: string;
	author?: string;
	timestamp?: number;
	gallery?: MediaItem[];
	useNineGrid?: boolean;
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
	useNineGrid,
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
				useNineGrid={useNineGrid}
				className="shadow-2xl min-h-full"
			/>
		</ModalContainer>
	);
};
