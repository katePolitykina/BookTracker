import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EpubView } from 'react-reader';
import api from '../lib/api';
import { Button } from './ui/button';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Normalize API URL to avoid double /api
const getBaseURL = () => {
    let baseUrl = API_URL;
    // Remove trailing slash
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }
    // If API_URL already contains /api, don't add it again
    if (baseUrl.endsWith('/api')) {
        return baseUrl;
    }
    // Otherwise add /api
    return `${baseUrl}/api`;
};

export default function EpubReader() {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const [bookState, setBookState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState(null);
    const [progress, setProgress] = useState(0);
    const [epubBlobUrl, setEpubBlobUrl] = useState(null);
    
    const startTimeRef = useRef(null);
    const activeTimeRef = useRef(0);
    const heartbeatIntervalRef = useRef(null);
    const lastSaveRef = useRef(null);
    const renditionRef = useRef(null);

    useEffect(() => {
        fetchBookState();
        fetchEpubFile();
        
        // Track active reading time
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Page hidden - pause tracking
                if (startTimeRef.current) {
                    activeTimeRef.current += Date.now() - startTimeRef.current;
                    startTimeRef.current = null;
                }
            } else {
                // Page visible - resume tracking
                if (!startTimeRef.current) {
                    startTimeRef.current = Date.now();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        startTimeRef.current = Date.now();

        // Heartbeat every 30 seconds
        heartbeatIntervalRef.current = setInterval(() => {
            saveReadingSession(false);
        }, 30000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
            // Save session on unmount
            saveReadingSession(true);
            // Clean up blob URL
            if (epubBlobUrl) {
                URL.revokeObjectURL(epubBlobUrl);
            }
        };
    }, [bookId]);

    const fetchBookState = async () => {
        try {
            // Get book state - check all shelves to find the book
            const readingResponse = await api.get('/shelves/reading').catch(() => ({ data: [] }));
            const state = readingResponse.data.find(s => 
                s.book._id === bookId || s.book === bookId
            );
            
            if (state) {
                setBookState(state);
                setLocation(state.lastLocation || null);
                setProgress(state.progressPercent || 0);
            } else {
                // Create book state if it doesn't exist
                await api.post(`/shelves/${bookId}`, { status: 'reading' });
                const newReadingResponse = await api.get('/shelves/reading').catch(() => ({ data: [] }));
                const newState = newReadingResponse.data.find(s => 
                    s.book._id === bookId || s.book === bookId
                );
                if (newState) {
                    setBookState(newState);
                }
            }
        } catch (error) {
            console.error('Error fetching book state:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEpubFile = async () => {
        try {
            // Fetch EPUB file as blob with authentication
            const response = await api.get(`/read/${bookId}/content`, {
                responseType: 'blob'
            });
            
            // Create blob URL
            const blobUrl = URL.createObjectURL(response.data);
            setEpubBlobUrl(blobUrl);
        } catch (error) {
            console.error('Error fetching EPUB file:', error);
        }
    };

    const saveReadingSession = async (isExiting = false) => {
        if (!bookId) return;

        // Calculate active time
        let totalActiveTime = activeTimeRef.current;
        if (startTimeRef.current) {
            totalActiveTime += Date.now() - startTimeRef.current;
        }

        // Only save if we have meaningful reading time (at least 10 seconds)
        if (totalActiveTime < 10000 && !isExiting) {
            return;
        }

        const durationSeconds = Math.round(totalActiveTime / 1000);
        
        // Ensure durationSeconds is at least 1 second
        const finalDurationSeconds = Math.max(1, durationSeconds);

        // Reset active time
        activeTimeRef.current = 0;
        if (startTimeRef.current) {
            startTimeRef.current = Date.now();
        }

        try {
            await api.post(`/read/${bookId}/session`, {
                durationSeconds: finalDurationSeconds,
                lastLocation: location,
                progressPercent: progress
            });

            lastSaveRef.current = Date.now();
        } catch (error) {
            console.error('Error saving reading session:', error);
        }
    };

    const handleLocationChange = (epubcfi) => {
        setLocation(epubcfi);
        
        // Calculate progress if we have total locations (simplified)
        // In a real implementation, you'd get total locations from the book
        // For now, we'll estimate based on CFI position
        if (epubcfi) {
            // Simple progress estimation based on CFI
            // This is a simplified approach - in production, use proper EPUB parsing
            const match = epubcfi.match(/\[(\d+)\]/);
            if (match) {
                const position = parseInt(match[1]);
                // Rough estimate - adjust based on your needs
                const estimatedProgress = Math.min(100, Math.max(0, (position / 1000) * 100));
                setProgress(estimatedProgress);
            }
        }
    };

    const handleExit = () => {
        saveReadingSession(true);
        navigate('/shelves');
    };

    const handleNext = () => {
        if (renditionRef.current) {
            renditionRef.current.next();
        }
    };

    const handlePrev = () => {
        if (renditionRef.current) {
            renditionRef.current.prev();
        }
    };

    if (loading || !epubBlobUrl) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading book...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
                <div>
                    <h2 className="font-semibold">{bookState?.book?.title || 'Reading'}</h2>
                    <p className="text-sm text-gray-400">{bookState?.book?.author}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm">
                        Progress: {progress.toFixed(1)}%
                    </div>
                    <Button variant="outline" onClick={handleExit} className="bg-white text-gray-900">
                        Exit
                    </Button>
                </div>
            </div>

            {/* Navigation Controls */}
            <div className="bg-gray-800 text-white px-4 py-2 flex justify-center gap-4 items-center">
                <Button 
                    variant="outline" 
                    onClick={handlePrev} 
                    className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
                >
                    ← Previous
                </Button>
                <Button 
                    variant="outline" 
                    onClick={handleNext} 
                    className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
                >
                    Next →
                </Button>
            </div>

            {/* Reader */}
            <div className="flex-1 overflow-hidden">
                <EpubView
                    url={epubBlobUrl}
                    epubInitOptions={{
                        openAs: 'epub'
                    }}
                    location={location}
                    locationChanged={handleLocationChange}
                    getRendition={(rendition) => {
                        // Store rendition reference
                        renditionRef.current = rendition;
                        
                        // Display saved location if available
                        if (location && rendition) {
                            rendition.display(location);
                        }
                        
                        // Set up navigation handlers
                        if (rendition) {
                            rendition.on('relocated', (loc) => {
                                if (loc?.start?.cfi) {
                                    handleLocationChange(loc.start.cfi);
                                }
                            });
                            
                            // Add keyboard navigation
                            rendition.on('keyup', (e) => {
                                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                                    handleNext();
                                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                                    handlePrev();
                                }
                            });
                        }
                    }}
                />
            </div>
        </div>
    );
}

