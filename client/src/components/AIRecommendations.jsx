import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import BookCard from './BookCard';
import { Sparkles } from 'lucide-react';

export default function AIRecommendations() {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(new Set());
    const navigate = useNavigate();
    
    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await api.get('/recommendations');
            setRecommendations(response.data || []);
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            alert('Не удалось получить рекомендации');
        } finally {
            setLoading(false);
        }
    };
    
    const handleImport = async (recommendation) => {
        setImporting(prev => new Set(prev).add(recommendation.gutenbergId || recommendation.title));
        
        try {
            // Try to import by gutenbergId first
            if (recommendation.gutenbergId) {
                try {
                    await api.post('/books/import', { gutenbergId: recommendation.gutenbergId });
                    alert('Книга успешно импортирована!');
                    navigate('/shelves');
                    return;
                } catch (importError) {
                    // If import by ID fails, try searching
                    console.warn('Import by ID failed, trying search:', importError);
                }
            }
            
            // Fallback: search by title and author
            try {
                const searchQuery = `${recommendation.title} ${recommendation.author}`;
                const searchResponse = await api.get(`/books/search?q=${encodeURIComponent(searchQuery)}`);
                const results = searchResponse.data.results || [];
                
                if (results.length > 0) {
                    // Import the first result
                    await api.post('/books/import', { gutenbergId: results[0].id });
                    alert('Книга успешно импортирована!');
                    navigate('/shelves');
                } else {
                    alert('Книга не найдена в Project Gutenberg');
                }
            } catch (searchError) {
                console.error('Search and import error:', searchError);
                alert('Не удалось импортировать книгу');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Не удалось импортировать книгу');
        } finally {
            setImporting(prev => {
                const next = new Set(prev);
                next.delete(recommendation.gutenbergId || recommendation.title);
                return next;
            });
        }
    };
    
    return (
        <Card className="mb-8">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-yellow-500" size={24} />
                        <CardTitle>AI Советует</CardTitle>
                    </div>
                    <Button 
                        onClick={handleGenerate} 
                        disabled={loading}
                        variant="outline"
                    >
                        {loading ? 'Генерация...' : 'Сгенерировать подборку'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {recommendations.length > 0 ? (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            На основе ваших предпочтений мы подобрали следующие книги:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-stretch">
                            {recommendations.map((rec, index) => (
                                <div key={index} className="flex flex-col h-full">
                                    <BookCard
                                        book={{
                                            title: rec.title,
                                            author: rec.author,
                                            coverUrl: null
                                        }}
                                        onAction={() => handleImport(rec)}
                                        actionLabel={
                                            importing.has(rec.gutenbergId || rec.title) 
                                                ? 'Импорт...' 
                                                : 'Импорт'
                                        }
                                    />
                                    <p className="text-xs text-gray-600 line-clamp-3 mt-2 h-12">
                                        {rec.reason}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>Нажмите "Сгенерировать подборку" для получения персональных рекомендаций</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

