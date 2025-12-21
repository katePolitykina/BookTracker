import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import StarRating from './StarRating';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export default function BookReviewModal({ book, isOpen, onClose, onSave }) {
    const [rating, setRating] = useState(book?.rating || 0);
    const [review, setReview] = useState(book?.review || '');
    
    useEffect(() => {
        if (isOpen) {
            setRating(book?.rating || 0);
            setReview(book?.review || '');
        }
    }, [isOpen, book]);
    
    if (!isOpen) return null;
    
    const handleSave = () => {
        if (rating === 0) {
            alert('Пожалуйста, выберите рейтинг');
            return;
        }
        
        if (onSave) {
            onSave({ rating, review });
        }
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle>Оцените книгу</CardTitle>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-lg font-semibold mb-2">{book?.book?.title || book?.title}</p>
                        <p className="text-sm text-gray-600 mb-4">{book?.book?.author || book?.author}</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Рейтинг *</label>
                        <StarRating
                            rating={rating}
                            onRatingChange={setRating}
                            size={32}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Отзыв</label>
                        <textarea
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder="Напишите ваши впечатления о книге..."
                            className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={2000}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {review.length} / 2000 символов
                        </p>
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={onClose}>
                            Отмена
                        </Button>
                        <Button onClick={handleSave}>
                            Сохранить
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

