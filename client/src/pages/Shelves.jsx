import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import BookCard from '../components/BookCard';
import BookReviewModal from '../components/BookReviewModal';
import AIRecommendations from '../components/AIRecommendations';

export default function Shelves() {
    const [activeTab, setActiveTab] = useState('reading');
    const [books, setBooks] = useState({ want: [], reading: [], finished: [], dropped: [] });
    const [loading, setLoading] = useState(true);
    const [reviewModal, setReviewModal] = useState({ isOpen: false, book: null });
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        fetchBooks();
    }, [activeTab]);

    useEffect(() => {
        fetchBooks();
    }, [location.pathname]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchBooks();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const fetchBooks = async () => {
        try {
            const statuses = ['want', 'reading', 'finished', 'dropped'];
            const promises = statuses.map(status =>
                api.get(`/shelves/${status}`).catch(() => ({ data: [] }))
            );
            const results = await Promise.all(promises);

            const readingBooks = (results[1].data || []).sort((a, b) => {
                if (!a.updatedAt || !b.updatedAt) return 0;
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });

            setBooks({
                want: results[0].data || [],
                reading: readingBooks,
                finished: results[2].data || [],
                dropped: results[3].data || []
            });
        } catch (error) {
            console.error('Error fetching books:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBookClick = (bookState) => {
        navigate(`/read/${bookState.book._id}`);
    };

    const handleReviewClick = (bookState) => {
        setReviewModal({ isOpen: true, book: bookState });
    };

    const handleRateBook = async (bookState, newRating) => {
        try {
            await api.put(`/shelves/${bookState.book._id}`, { rating: newRating });
            fetchBooks();
        } catch (error) {
            console.error('Error rating book:', error);
            alert('Failed to save rating'); // Translate
        }
    };

    const handleReviewSave = async (reviewData) => {
        if (!reviewModal.book) return;

        try {
            await api.put(`/shelves/${reviewModal.book.book._id}`, {
                rating: reviewData.rating,
                review: reviewData.review
            });
            setReviewModal({ isOpen: false, book: null });
            fetchBooks();
        } catch (error) {
            console.error('Error saving review:', error);
            alert('Failed to save review'); // Translate
        }
    };

    const handleDeleteBook = async (bookState) => {
        if (bookState.status === 'dropped') {
            // Translate confirmation
            if (!window.confirm(`Are you sure you want to permanently delete "${bookState.book.title}"?`)) return;
            try {
                await api.delete(`/shelves/${bookState.book._id}`);
                fetchBooks();
            } catch (error) {
                console.error('Error deleting book:', error);
            }
        } else {
            // Translate confirmation
            if (!window.confirm(`Move "${bookState.book.title}" to "Dropped"?`)) return;
            try {
                await api.put(`/shelves/${bookState.book._id}`, { status: 'dropped' });
                fetchBooks();
            } catch (error) {
                console.error('Error moving book:', error);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading shelves...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold mb-6">My Shelves</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="want">Want to Read</TabsTrigger>
                    <TabsTrigger value="reading">Reading</TabsTrigger>
                    <TabsTrigger value="finished">Finished</TabsTrigger>
                    <TabsTrigger value="dropped">Dropped</TabsTrigger>
                </TabsList>

                {['want', 'reading', 'finished', 'dropped'].map(status => (
                    <TabsContent key={status} value={status}>

                        {/* 1. Сначала выводим список книг (или сообщение, что пусто) */}
                        {books[status].length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4 items-stretch">
                                {books[status].map((bookState) => {
                                    if (!bookState.book) return null;

                                    return (
                                        <div key={bookState._id} className="relative group flex flex-col">
                                            <BookCard
                                                book={bookState.book}
                                                bookState={bookState}
                                                onAction={() => handleBookClick(bookState)}
                                                actionLabel="Read" // Translate
                                                onRate={(rating) => handleRateBook(bookState, rating)}
                                            />

                                            <div className="mt-2">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span>Progress</span>
                                                    <span>{(bookState.progressPercent || 0).toFixed(0)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                    <div
                                                        className="bg-blue-600 h-1.5 rounded-full"
                                                        style={{ width: `${bookState.progressPercent || 0}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReviewClick(bookState);
                                                    }}
                                                    className="bg-white/90 hover:bg-blue-50 text-blue-600 rounded-full p-2 shadow-sm border border-gray-200 transition-colors"
                                                    title="Edit Review" // Translate
                                                >
                                                    <Pencil size={16} />
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteBook(bookState);
                                                    }}
                                                    className="bg-white/90 hover:bg-red-50 text-red-500 rounded-full p-2 shadow-sm border border-gray-200 transition-colors"
                                                    title={status === 'dropped' ? "Delete permanently" : "Move to Dropped"} // Translate
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <p>No books in this shelf</p>
                            </div>
                        )}

                        {/* 2. Теперь AI Рекомендации находятся ВНИЗУ */}
                        {/* Добавлен отступ mt-10 для красоты */}
                        {status === 'want' && (
                            <div className="mt-10 mb-6">
                                <AIRecommendations />
                            </div>
                        )}

                    </TabsContent>
                ))}
            </Tabs>

            <BookReviewModal
                book={reviewModal.book}
                isOpen={reviewModal.isOpen}
                onClose={() => setReviewModal({ isOpen: false, book: null })}
                onSave={handleReviewSave}
            />
        </div>
    );
}