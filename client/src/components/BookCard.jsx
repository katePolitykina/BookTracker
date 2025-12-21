import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import StarRating from './StarRating';

export default function BookCard({ book, bookState, onAction, actionLabel = "View" }) {
    // Support both book.book and book directly
    const bookData = book.book || book;
    const rating = bookState?.rating || book?.rating;
    
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
            <div className="aspect-[2/3] bg-gray-200 flex items-center justify-center flex-shrink-0">
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
            </div>
            <CardContent className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-lg mb-1 line-clamp-2">{bookData.title}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-1">{bookData.author}</p>
                <div className="flex-1"></div>
                {rating && (
                    <div className="mb-3">
                        <StarRating rating={rating} readonly={true} size={16} />
                    </div>
                )}
                {onAction && (
                    <Button 
                        onClick={() => onAction(book)} 
                        className="w-full"
                        size="sm"
                    >
                        {actionLabel}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

