import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import StarRating from './StarRating';

export default function BookCard({ book, bookState, onAction, actionLabel = "View", onRate, hideCover = false }) {
    const bookData = book.book || book;
    const rating = bookState?.rating || book?.rating || 0;

    const isInteractive = typeof onRate === 'function';
    const shouldRenderStars = rating > 0 || isInteractive;

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col border border-gray-200 group">

            {/* Обложка рендерится только если hideCover === false */}
            {!hideCover && (
                <div className="relative aspect-[2/3] bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {bookData.coverUrl ? (
                        <img
                            src={bookData.coverUrl}
                            alt={bookData.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-gray-400 text-center p-4">
                            <p className="text-sm">No Cover</p>
                        </div>
                    )}

                    {shouldRenderStars && (
                        <div
                            className={`
                                absolute bottom-2 left-0 right-0 
                                flex justify-center items-center
                                transition-opacity duration-200
                                ${rating > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                            `}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <StarRating
                                rating={rating}
                                onRatingChange={isInteractive ? onRate : undefined}
                                readonly={!isInteractive}
                                size={20}
                                className="gap-1 drop-shadow-md filter"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Важно: h-full помогает контенту понять высоту родителя */}
            <CardContent className="p-4 flex flex-col flex-1 h-full min-h-0">
                <div className="flex justify-between items-start gap-2 flex-shrink-0">
                    <h3 className="font-semibold text-base mb-1 line-clamp-2 leading-tight" title={bookData.title}>
                        {bookData.title}
                    </h3>

                    {/* Если обложки нет, показываем рейтинг тут */}
                    {hideCover && shouldRenderStars && (
                        <div className="flex-shrink-0 mt-1">
                            <StarRating rating={rating} readonly size={14} className="gap-0.5" />
                        </div>
                    )}
                </div>

                <p className="text-xs text-gray-500 mb-3 line-clamp-1 flex-shrink-0">{bookData.author}</p>

                {/* --- БЛОК ОПИСАНИЯ --- */}
                {bookData.description && (
                    <div className={`
                        text-xs text-gray-600 mb-3 pr-2 
                        overflow-y-auto
                        /* Красивый скроллбар (опционально, работает в Chrome/Safari) */
                        scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
                        
                        ${hideCover
                        ? 'flex-1 min-h-0' // <-- ГЛАВНОЕ: Занимает все место и включает скролл
                        : 'h-24 flex-shrink-0' // <-- Обычный режим: фикс высота
                    }
                    `}>
                        {bookData.description}
                    </div>
                )}

                {/* Если описание в режиме flex-1, то пустой spacer внизу больше не нужен,
                   так как описание само толкает кнопку вниз.
                   Но если описания НЕТ, нам нужно пустое пространство. */}
                {!bookData.description && <div className="flex-1"></div>}

                {onAction && (
                    <Button
                        onClick={() => onAction(book)}
                        className="w-full mt-auto flex-shrink-0" // mt-auto на всякий случай
                        size="sm"
                    >
                        {actionLabel}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}