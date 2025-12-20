import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

export default function BookCard({ book, onAction, actionLabel = "View" }) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-[2/3] bg-gray-200 flex items-center justify-center">
                {book.coverUrl ? (
                    <img 
                        src={book.coverUrl} 
                        alt={book.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="text-gray-400 text-center p-4">
                        <p className="text-sm">No Cover</p>
                    </div>
                )}
            </div>
            <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1 line-clamp-2">{book.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{book.author}</p>
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

