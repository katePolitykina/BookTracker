import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import BookCard from '../components/BookCard';
import { Card, CardContent } from '../components/ui/card';

export default function Search() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(new Set());
    const navigate = useNavigate();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const response = await api.get(`/books/search?q=${encodeURIComponent(query)}`);
            setResults(response.data.results || []);
        } catch (error) {
            console.error('Search error:', error);
            alert('Failed to search books');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (book) => {
        const gutenbergId = book.id;
        setImporting(prev => new Set(prev).add(gutenbergId));

        try {
            const response = await api.post('/books/import', { gutenbergId });
            alert('Book imported successfully!');
            navigate('/shelves');
        } catch (error) {
            console.error('Import error:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to import book';
            alert(errorMessage);
        } finally {
            setImporting(prev => {
                const next = new Set(prev);
                next.delete(gutenbergId);
                return next;
            });
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold mb-6">Search Books</h1>
                
                <form onSubmit={handleSearch} className="mb-8">
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search Project Gutenberg..."
                            className="flex-1"
                        />
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Searching...' : 'Search'}
                        </Button>
                    </div>
                </form>

                {results.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-stretch">
                        {results.map((book) => (
                            <BookCard
                                key={book.id}
                                book={{
                                    title: book.title,
                                    author: book.authors?.map(a => a.name).join(', ') || 'Unknown',
                                    coverUrl: book.formats?.['image/jpeg']
                                }}
                                onAction={() => handleImport(book)}
                                actionLabel={importing.has(book.id) ? 'Importing...' : 'Import'}
                            />
                        ))}
                    </div>
                )}

                {results.length === 0 && !loading && query && (
                    <Card>
                        <CardContent className="p-8 text-center text-gray-500">
                            No results found
                        </CardContent>
                    </Card>
                )}
        </div>
    );
}

