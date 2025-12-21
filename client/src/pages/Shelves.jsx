import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import BookCard from '../components/BookCard';
import { Button } from '../components/ui/button';

export default function Shelves() {
    const [activeTab, setActiveTab] = useState('reading');
    const [books, setBooks] = useState({ want: [], reading: [], finished: [], dropped: [] });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        fetchBooks();
    }, [activeTab]);
    
    // Also fetch when component mounts or when location changes (e.g., when returning from reader)
    useEffect(() => {
        fetchBooks();
    }, [location.pathname]);
    
    // Refresh books when page becomes visible (e.g., when returning from reader)
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
            
            // Sort reading books by updatedAt (most recently read first)
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

    const handleStatusChange = async (bookState, newStatus) => {
        try {
            await api.put(`/shelves/${bookState.book._id}`, { status: newStatus });
            fetchBooks();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update book status');
        }
    };

    const handleDeleteBook = async (bookState) => {
        // If book is already in dropped, delete it completely
        if (bookState.status === 'dropped') {
            if (!window.confirm(`Вы уверены, что хотите полностью удалить книгу "${bookState.book.title}"? Книга будет удалена из всех полок.`)) {
                return;
            }

            try {
                await api.delete(`/shelves/${bookState.book._id}`);
                fetchBooks();
            } catch (error) {
                console.error('Error deleting book:', error);
                alert('Не удалось удалить книгу');
            }
        } else {
            // Otherwise, move to dropped
            if (!window.confirm(`Вы уверены, что хотите удалить книгу "${bookState.book.title}"? Книга будет перемещена в "Dropped".`)) {
                return;
            }

            try {
                await api.put(`/shelves/${bookState.book._id}`, { status: 'dropped' });
                fetchBooks();
            } catch (error) {
                console.error('Error deleting book:', error);
                alert('Не удалось удалить книгу');
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
                            {books[status].length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                                    {books[status].map((bookState) => {
                                        if (!bookState.book) {
                                            return null; // Skip rendering if book is null
                                        }
                                        
                                        return (
                                        <div key={bookState._id} className="relative group">
                                            <BookCard
                                                book={bookState.book}
                                                onAction={() => handleBookClick(bookState)}
                                                actionLabel="Read"
                                            />
                                            {(bookState.progressPercent || 0) > 0 && (
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
                                            )}
                                            {/* Delete button - show on hover */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteBook(bookState);
                                                }}
                                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Удалить книгу"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <p>No books in this shelf</p>
                                </div>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
        </div>
    );
}


