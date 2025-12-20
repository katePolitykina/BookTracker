import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import BookCard from '../components/BookCard';
import { Button } from '../components/ui/button';

export default function Shelves() {
    const [activeTab, setActiveTab] = useState('reading');
    const [books, setBooks] = useState({ want: [], reading: [], finished: [], dropped: [] });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBooks();
    }, [activeTab]);
    
    // Also fetch when component mounts (in case we navigated from import/upload)
    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async () => {
        try {
            const statuses = ['want', 'reading', 'finished', 'dropped'];
            const promises = statuses.map(status => 
                api.get(`/shelves/${status}`).catch(() => ({ data: [] }))
            );
            const results = await Promise.all(promises);
            
            setBooks({
                want: results[0].data || [],
                reading: results[1].data || [],
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
                                        <div key={bookState._id} className="relative">
                                            <BookCard
                                                book={bookState.book}
                                                onAction={() => handleBookClick(bookState)}
                                                actionLabel="Read"
                                            />
                                            {bookState.progressPercent > 0 && (
                                                <div className="mt-2">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span>Progress</span>
                                                        <span>{bookState.progressPercent.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                        <div
                                                            className="bg-blue-600 h-1.5 rounded-full"
                                                            style={{ width: `${bookState.progressPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
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

