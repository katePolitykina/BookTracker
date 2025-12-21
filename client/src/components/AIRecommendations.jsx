import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import BookCard from './BookCard';
import { Sparkles } from 'lucide-react';

export default function AIRecommendations() {
    const [recommendationGroups, setRecommendationGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(new Set());
    const navigate = useNavigate();

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await api.get('/recommendations');
            setRecommendationGroups(response.data || []);
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            alert('Failed to fetch recommendations'); // Перевод
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (book) => {
        const importKey = book.gutenbergId || book.title;
        setImporting(prev => new Set(prev).add(importKey));

        try {
            // 1. Try import by ID
            if (book.gutenbergId) {
                try {
                    await api.post('/books/import', { gutenbergId: book.gutenbergId });
                    alert('Book successfully added to shelf!'); // Перевод
                    navigate('/shelves');
                    return;
                } catch (e) {
                    console.warn('Direct import failed, falling back to search');
                }
            }

            // 2. Fallback: search and import first result
            const query = `${book.title} ${book.author}`;
            const searchRes = await api.get(`/books/search?q=${encodeURIComponent(query)}`);
            const foundBooks = searchRes.data.results || [];

            if (foundBooks.length > 0) {
                await api.post('/books/import', { gutenbergId: foundBooks[0].id });
                alert('Book successfully added to shelf!'); // Перевод
                navigate('/shelves');
            } else {
                alert('Unfortunately, the book was not found in the library.'); // Перевод
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Error adding book.'); // Перевод
        } finally {
            setImporting(prev => {
                const next = new Set(prev);
                next.delete(importKey);
                return next;
            });
        }
    };

    return (
        // Changed border-indigo-100 -> border-blue-100
        // Changed to-indigo-50/50 -> to-blue-50/50
        <Card className="mb-8 border-blue-100 bg-gradient-to-br from-white to-blue-50/50">
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        {/* Changed text-indigo-600 -> text-blue-600 */}
                        <Sparkles className="text-blue-600" size={24} />
                        {/* Changed text-indigo-900 -> text-blue-900 */}
                        <CardTitle className="text-blue-900">AI Recommendations</CardTitle>
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={loading}
                        // Changed bg-indigo-600 -> bg-blue-600 (и hover тоже)
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {loading ? 'Gemini is thinking...' : 'Generate Recommendations'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {recommendationGroups.length > 0 ? (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <p className="text-sm text-gray-600 italic">
                            Based on your ratings, we selected books in three categories:
                        </p>

                        {recommendationGroups.map((group, idx) => (
                            <div key={idx} className="space-y-3">
                                {/* Changed border-indigo-500 -> border-blue-500 */}
                                <h3 className="text-lg font-bold text-gray-800 border-l-4 border-blue-500 pl-3">
                                    {group.genre}
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-stretch">
                                    {group.books.map((book, bIdx) => (
                                        <div key={bIdx} className="h-full">
                                            <BookCard
                                                book={{
                                                    ...book,
                                                    description: book.reason // Передаем причину как описание
                                                }}
                                                hideCover={true}
                                                onAction={() => handleImport(book)}
                                                actionLabel={
                                                    importing.has(book.gutenbergId || book.title)
                                                        ? 'Adding...'
                                                        : 'Add'
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-500">
                        <p>Click the button to get personalized genre recommendations from Gemini AI</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}