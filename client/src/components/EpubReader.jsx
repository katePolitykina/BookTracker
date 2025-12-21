import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EpubView } from 'react-reader';
import api from '../lib/api';
import { Button } from './ui/button';
import ReaderSettings from './ReaderSettings';

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

// Default settings
const DEFAULT_SETTINGS = {
    fontFamily: 'Georgia',
    fontSize: 16,
    backgroundColor: '#ffffff',
    textColor: '#000000',
    spread: 'none'
};

// Load settings from localStorage
const loadSettings = () => {
    try {
        const stored = localStorage.getItem('readerSettings');
        if (stored) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
    return DEFAULT_SETTINGS;
};

// Save settings to localStorage
const saveSettings = (settings) => {
    try {
        localStorage.setItem('readerSettings', JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
};

export default function EpubReader() {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const [bookState, setBookState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState(null);
    const [progress, setProgress] = useState(0);
    const [epubBlobUrl, setEpubBlobUrl] = useState(null);
    const [settings, setSettings] = useState(loadSettings);
    const [showSettings, setShowSettings] = useState(false);
    const [chapters, setChapters] = useState([]);
    
    const startTimeRef = useRef(null);
    const activeTimeRef = useRef(0);
    const heartbeatIntervalRef = useRef(null);
    const lastSaveRef = useRef(null);
    const renditionRef = useRef(null);
    const bookRef = useRef(null);
    const progressRef = useRef(0);
    const savedCfiBeforeSettingsRef = useRef(null); // CFI saved when settings modal opens

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
                const savedProgress = state.progressPercent || 0;
                setProgress(savedProgress);
                progressRef.current = savedProgress; // Сохраняем в ref, чтобы не потерять при сохранении
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
            // Use ref to get the most current progress value
            const currentProgress = progressRef.current || progress;
            
            // Get current location from rendition if available, otherwise use state
            let currentLocation = location;
            if (renditionRef.current) {
                try {
                    const currentLocationObj = renditionRef.current.currentLocation();
                    if (currentLocationObj && currentLocationObj.start && currentLocationObj.start.cfi) {
                        currentLocation = currentLocationObj.start.cfi;
                    }
                } catch (locationError) {
                    // If we can't get location from rendition, use state value
                    console.warn('Could not get current location from rendition:', locationError);
                }
            }
            
            // Only send lastLocation if it's a valid non-empty string
            // Don't send null or undefined to avoid overwriting saved location
            const lastLocationToSend = (currentLocation && currentLocation !== '') ? currentLocation : undefined;
            
            await api.post(`/read/${bookId}/session`, {
                durationSeconds: finalDurationSeconds,
                ...(lastLocationToSend !== undefined && { lastLocation: lastLocationToSend }),
                progressPercent: currentProgress
            });

            lastSaveRef.current = Date.now();
        } catch (error) {
            console.error('Error saving reading session:', error);
        }
    };

    // Function to calculate progress from CFI without updating display
    const calculateProgressFromCfi = async (epubcfi, updateDisplay = true) => {
        if (!epubcfi || !bookRef.current || !bookRef.current.locations) {
            return null;
        }

        try {
            const locations = bookRef.current.locations;
            const currentProgress = progressRef.current || 0;
            
            const getLocationsLength = () => {
                if (typeof locations.length === 'function') {
                    return locations.length();
                }
                return locations.length || 0;
            };
            
            let locationsLength = getLocationsLength();
            
            // Ensure locations are generated
            if (locationsLength === 0) {
                await locations.generate(1024);
                let attempts = 0;
                let currentLength = getLocationsLength();
                while (attempts < 30 && currentLength === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    currentLength = getLocationsLength();
                    attempts++;
                }
                locationsLength = currentLength;
            }
            
            if (locationsLength > 0) {
                try {
                    let locationIndex = null;
                    if (typeof locations.locationFromCfi === 'function') {
                        locationIndex = locations.locationFromCfi(epubcfi);
                    }
                    
                    if (locationIndex !== null && locationIndex !== undefined && locationIndex >= 0) {
                        const calculatedProgress = Math.min(100, Math.max(0, (locationIndex / locationsLength) * 100));
                        
                        
                        // Only update if:
                        // 1. updateDisplay is true AND
                        // 2. Either calculated progress > 0 OR current progress is 0
                        // This prevents resetting to 0 when we have a saved progress > 0
                        if (updateDisplay && (calculatedProgress > 0 || currentProgress === 0)) {
                            progressRef.current = calculatedProgress;
                            setProgress(calculatedProgress);
                        }
                        
                        return calculatedProgress;
                    }
                } catch (cfiError) {
                    console.warn('Could not get location from CFI:', cfiError);
                }
            }
        } catch (error) {
            console.error('Error calculating progress:', error);
        }
        
        return null;
    };

    const handleLocationChange = async (epubcfi) => {
        
        if (!epubcfi) return;
        
        setLocation(epubcfi);
        
        // Calculate progress - this will update display only after calculation is complete
        await calculateProgressFromCfi(epubcfi, true);
        
        // Old code below - keeping for fallback but should not be reached
        if (false && bookRef.current && bookRef.current.locations) {
            try {
                const locations = bookRef.current.locations;
                
                
                // Ensure locations are generated
                // In epub.js, locations.length is a function, not a property!
                const getLocationsLength = () => {
                    if (typeof locations.length === 'function') {
                        return locations.length();
                    }
                    return locations.length || 0;
                };
                
                let locationsLength = getLocationsLength();
                
                if (locationsLength === 0) {
                    try {
                        await locations.generate(1024);
                        // Wait a bit for generation to complete
                        let attempts = 0;
                        let currentLength = getLocationsLength();
                        while (attempts < 30 && currentLength === 0) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                            currentLength = getLocationsLength();
                            attempts++;
                        }
                    } catch (genError) {
                        console.error('Error generating locations:', genError);
                    }
                }
                
                // Get current location index from CFI
                const finalLocationsLength = getLocationsLength();
                
                if (finalLocationsLength > 0) {
                    try {
                        // Try locationFromCfi first
                        let locationIndex = null;
                        if (typeof locations.locationFromCfi === 'function') {
                            locationIndex = locations.locationFromCfi(epubcfi);
                        } else if (locations.cfiFromLocation && typeof locations.cfiFromLocation === 'function') {
                            // Alternative: find index by comparing CFIs
                            // This is less efficient but more reliable
                            for (let i = 0; i < finalLocationsLength; i++) {
                                try {
                                    const cfi = locations.cfiFromLocation(i);
                                    if (cfi && epubcfi.includes(cfi.substring(0, 20))) {
                                        locationIndex = i;
                                        break;
                                    }
                                } catch (e) {
                                    continue;
                                }
                            }
                        }
                        
                        
                        if (locationIndex !== null && locationIndex !== undefined && locationIndex >= 0) {
                            const calculatedProgress = Math.min(100, Math.max(0, (locationIndex / finalLocationsLength) * 100));
                            // Update ref first, then state - this ensures we don't lose progress during async operations
                            progressRef.current = calculatedProgress;
                            setProgress(calculatedProgress);
                        } else {
                            // Don't update progress if calculation failed - keep current value
                        }
                    } catch (cfiError) {
                        // If locationFromCfi fails, try to estimate based on CFI
                        console.warn('Could not get location from CFI, using fallback:', cfiError);
                        // Fallback: try to extract position from CFI string
                        const match = epubcfi.match(/\[(\d+)\]/);
                        if (match) {
                            const position = parseInt(match[1]);
                            const estimatedProgress = Math.min(100, Math.max(0, (position / 1000) * 100));
                            // Update both state and ref only when calculation is complete
                            progressRef.current = estimatedProgress;
                            setProgress(estimatedProgress);
                        } else {
                            // Keep current progress if fallback also failed
                        }
                    }
                } else {
                }
            } catch (error) {
                console.error('Error calculating progress:', error);
            }
        } else {
        }
    };

    const handleExit = async () => {
        // Save session before exiting
        await saveReadingSession(true);
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

    const handleSettingsChange = (newSettings) => {
        setSettings(newSettings);
        saveSettings(newSettings);
        applySettings(newSettings);
    };

    // Function to get CFI of first visible paragraph
    const getFirstVisibleParagraphCfi = () => {
        if (!renditionRef.current || !bookRef.current) return null;
        
        try {
            // Get iframe containing the rendered content
            const iframe = renditionRef.current.manager?.container?.querySelector('iframe');
            if (!iframe || !iframe.contentDocument) return null;
            
            const doc = iframe.contentDocument;
            const viewport = iframe.contentWindow;
            
            // Get viewport dimensions
            const viewportTop = viewport.scrollY || 0;
            const viewportHeight = viewport.innerHeight || iframe.clientHeight;
            const viewportBottom = viewportTop + viewportHeight;
            
            // Find all paragraph elements
            const paragraphs = doc.querySelectorAll('p');
            
            // Find first visible paragraph (at least partially visible in viewport)
            for (let i = 0; i < paragraphs.length; i++) {
                const p = paragraphs[i];
                const rect = p.getBoundingClientRect();
                const elementTop = rect.top + viewportTop;
                const elementBottom = elementTop + rect.height;
                
                // Check if paragraph is visible in viewport (at least partially)
                if (elementBottom >= viewportTop && elementTop <= viewportBottom) {
                    // Get CFI for this paragraph element
                    try {
                        if (bookRef.current.cfiFromElement) {
                            const cfi = bookRef.current.cfiFromElement(p);
                            return cfi;
                        }
                    } catch (cfiError) {
                        continue;
                    }
                }
            }
        } catch (error) {
            // Error finding first visible paragraph - return null
        }
        
        return null;
    };

    const applySettings = (settingsToApply) => {
        if (!renditionRef.current) return;

        try {
            // Use CFI saved when settings modal was opened (first visible paragraph)
            // This ensures we restore to the same paragraph, not just a position
            const cfiToRestore = savedCfiBeforeSettingsRef.current || location;
            
            if (!cfiToRestore) {
                // No location to restore, just apply settings
                renditionRef.current.themes.register('custom', {
                    'body': {
                        'font-family': `${settingsToApply.fontFamily}, serif !important`,
                        'font-size': `${settingsToApply.fontSize}px !important`,
                        'background-color': `${settingsToApply.backgroundColor} !important`,
                        'color': `${settingsToApply.textColor} !important`
                    }
                });
                renditionRef.current.themes.select('custom');
                renditionRef.current.spread(settingsToApply.spread);
                return;
            }
            
            // Apply theme
            renditionRef.current.themes.register('custom', {
                'body': {
                    'font-family': `${settingsToApply.fontFamily}, serif !important`,
                    'font-size': `${settingsToApply.fontSize}px !important`,
                    'background-color': `${settingsToApply.backgroundColor} !important`,
                    'color': `${settingsToApply.textColor} !important`
                }
            });
            renditionRef.current.themes.select('custom');

            // Apply spread
            renditionRef.current.spread(settingsToApply.spread);
            
            // Restore position after settings are applied
            // Use a flag to prevent multiple restorations
            let restored = false;
            const restorePosition = () => {
                if (restored || !renditionRef.current || !cfiToRestore) return;
                
                try {
                    renditionRef.current.display(cfiToRestore);
                    setLocation(cfiToRestore);
                    restored = true;
                } catch (displayError) {
                    console.warn('Could not restore position after settings change:', displayError);
                }
            };
            
            // Listen for 'rendered' event - this fires after content is rendered
            const renderedHandler = () => {
                restorePosition();
                // Remove handler after restoration
                if (renditionRef.current) {
                    renditionRef.current.off('rendered', renderedHandler);
                }
            };
            
            if (renditionRef.current) {
                renditionRef.current.on('rendered', renderedHandler);
            }
            
            // Also try to restore after a delay as backup
            setTimeout(() => {
                if (!restored) {
                    restorePosition();
                }
            }, 200);
        } catch (error) {
            console.error('Error applying settings:', error);
        }
    };

    const loadChapters = () => {
        if (!bookRef.current) return;

        try {

            const navigation = bookRef.current.navigation;
            if (navigation && navigation.toc) {

                // Flatten the TOC tree to get all chapters
                const flattenTOC = (items) => {
                    const result = [];
                    items.forEach(item => {
                        if (item.href) {
                            result.push({
                                label: item.label || 'Без названия',
                                href: item.href,
                                id: item.id
                            });
                        }
                        if (item.subitems && item.subitems.length > 0) {
                            result.push(...flattenTOC(item.subitems));
                        }
                    });
                    return result;
                };

                const chaptersList = flattenTOC(navigation.toc);
                

                setChapters(chaptersList);
            } else {
                setChapters([]);
            }
        } catch (error) {
            console.error('Error loading chapters:', error);
            setChapters([]);
        }
    };

    const handleGoToChapter = async (chapterHref) => {
        if (!renditionRef.current || !bookRef.current || !chapterHref) {
            return;
        }

        try {

            // Clean href - remove any URL prefix if present
            let cleanHref = chapterHref;
            
            
            if (cleanHref.includes('://')) {
                // Extract path after domain - handle URLs like http://localhost:5173/OEBPS/file.xhtml#anchor
                try {
                    const url = new URL(cleanHref);
                    // Get pathname and hash
                    cleanHref = url.pathname + (url.hash || '');
                    // Remove leading slash
                    if (cleanHref.startsWith('/')) {
                        cleanHref = cleanHref.substring(1);
                    }
                } catch (e) {
                    // If URL parsing fails, try manual extraction
                    const urlParts = cleanHref.split('/');
                    const oebpsIndex = urlParts.findIndex(part => part === 'OEBPS' || part.includes('.htm'));
                    if (oebpsIndex !== -1) {
                        cleanHref = urlParts.slice(oebpsIndex).join('/');
                    }
                }
            }
            // Remove OEBPS/ prefix if present
            if (cleanHref.startsWith('OEBPS/')) {
                cleanHref = cleanHref.substring(6);
            }


            // Convert href to CFI using book.cfiFromHref
            let targetCfi = null;
            try {
                // Method 1: Try cfiFromHref if available (preferred method)
                if (bookRef.current.cfiFromHref) {
                    
                    try {
                        targetCfi = await bookRef.current.cfiFromHref(cleanHref);
                        
                    } catch (cfiError) {
                    }
                } 
                
                // Method 2: Try to find in spine and use proper CFI format
                if (!targetCfi && bookRef.current.spine) {
                    // Extract filename from href (remove hash)
                    const hrefParts = cleanHref.split('#');
                    const filename = hrefParts[0];
                    const hash = hrefParts.length > 1 ? hrefParts[1] : null;
                    
                    
                    // Try different methods to find spine item
                    let spineItem = null;
                    
                    // Method 2a: Direct get by filename
                    spineItem = bookRef.current.spine.get(filename);
                    
                    // Method 2b: If not found, try searching through all spine items
                    if (!spineItem && bookRef.current.spine.items) {
                        for (let i = 0; i < bookRef.current.spine.items.length; i++) {
                            const item = bookRef.current.spine.items[i];
                            if (item.href && (item.href.includes(filename) || filename.includes(item.href))) {
                                spineItem = item;
                                break;
                            }
                        }
                    }
                    
                    // Method 2c: Try by index if spine has items array
                    if (!spineItem && bookRef.current.spine.items) {
                        // Try to find by matching href pattern
                        const items = Array.from(bookRef.current.spine.items || []);
                        spineItem = items.find(item => {
                            const itemHref = item.href || '';
                            return itemHref.includes(filename) || filename.includes(itemHref.split('/').pop());
                        });
                    }
                    
                    if (spineItem) {
                        
                        // Get CFI for the spine item using book.cfiFromHref with the spine item's href
                        // This is more reliable than using cfiBase directly
                        if (spineItem.href && bookRef.current.cfiFromHref) {
                            try {
                                const spineHref = spineItem.href;
                                targetCfi = await bookRef.current.cfiFromHref(spineHref);
                                
                            } catch (e) {
                            }
                        }
                        
                        // Fallback: Try using spine item's href directly if CFI methods failed
                        if (!targetCfi && spineItem.href) {
                            // Use the spine item's href - epub.js might accept it
                            targetCfi = spineItem.href;
                            
                        }
                    } else {
                    }
                }
                
                // Method 3: Fallback - try using href directly (may work for some EPUBs)
                if (!targetCfi) {
                    targetCfi = cleanHref;
                }
            } catch (cfiError) {
                // Try using href directly as last resort
                targetCfi = cleanHref;
            }

            if (targetCfi) {
                
                try {
                    await renditionRef.current.display(targetCfi);
                } catch (displayError) {
                    console.error('Error displaying chapter:', displayError);
                }
            } else {
                alert('Не удалось найти указанную главу');
            }
        } catch (error) {
            console.error('Error navigating to chapter:', error);
            alert('Ошибка перехода к главе: ' + error.message);
        }
    };

    const calculateTotalPages = async () => {
        if (!renditionRef.current || !bookRef.current) return;

        try {

            const locationsObj = bookRef.current.locations;
            

            // Check if locations need to be generated
            const currentLength = locationsObj?.length || 0;
            
            
            if (!locationsObj || currentLength === 0) {
                
                try {
                    await bookRef.current.locations.generate(1024);
                } catch (genError) {
                    throw genError;
                }
            }

            // Wait for locations to be ready (they generate asynchronously)
            let locationsLength = locationsObj?.length || 0;
            let attempts = 0;
            const maxAttempts = 30; // 3 seconds max wait
            
            while (attempts < maxAttempts && locationsLength === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
                locationsLength = locationsObj?.length || 0;
                attempts++;
                
            }
            

            if (locationsLength > 0) {
                // Try to use manager for more accurate page count
                const manager = renditionRef.current.manager;
                if (manager && manager.totalItems) {
                    setTotalPages(manager.totalItems);
                } else {
                    // Fallback: estimate based on locations
                    // Each location represents a reading position
                    // With current viewport, estimate pages
                    const estimatedPages = Math.max(1, Math.ceil(locationsLength / 2.5));
                    setTotalPages(estimatedPages);
                }
            } else {
                console.warn('No locations available for page calculation');
            }
        } catch (error) {
            console.error('Error calculating total pages:', error);
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
                        Progress: {(progressRef.current || progress || 0).toFixed(1)}%
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={() => {
                            // Save CFI of first visible paragraph when opening settings
                            const paragraphCfi = getFirstVisibleParagraphCfi();
                            if (paragraphCfi) {
                                savedCfiBeforeSettingsRef.current = paragraphCfi;
                            } else {
                                // Fallback to current location if we can't find paragraph
                                if (renditionRef.current) {
                                    try {
                                        const currentLocationObj = renditionRef.current.currentLocation();
                                        if (currentLocationObj && currentLocationObj.start && currentLocationObj.start.cfi) {
                                            savedCfiBeforeSettingsRef.current = currentLocationObj.start.cfi;
                                        } else if (location) {
                                            savedCfiBeforeSettingsRef.current = location;
                                        }
                                    } catch (e) {
                                        if (location) {
                                            savedCfiBeforeSettingsRef.current = location;
                                        }
                                    }
                                } else if (location) {
                                    savedCfiBeforeSettingsRef.current = location;
                                }
                            }
                            setShowSettings(true);
                        }}
                        className="bg-white text-gray-900"
                    >
                        Настройки
                    </Button>
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
                        
                        // Configure rendition to allow scripts in sandboxed iframe
                        if (rendition) {
                            // Function to modify iframe sandbox attribute
                            const modifyIframeSandbox = () => {
                                try {
                                    // Try multiple ways to find the iframe
                                    let iframe = null;
                                    
                                    // Method 1: Through manager.container
                                    if (rendition.manager && rendition.manager.container) {
                                        iframe = rendition.manager.container.querySelector('iframe');
                                    }
                                    
                                    // Method 2: Search in the entire document
                                    if (!iframe) {
                                        const allIframes = document.querySelectorAll('iframe');
                                        // Find iframe that contains EPUB content
                                        for (const frame of allIframes) {
                                            if (frame.src && (frame.src.includes('.epub') || frame.src.includes('OEBPS') || frame.contentDocument)) {
                                                iframe = frame;
                                                break;
                                            }
                                        }
                                    }
                                    
                                    // Method 3: Search by parent container
                                    if (!iframe && rendition.manager) {
                                        const container = rendition.manager.container || document.querySelector('[class*="epub"]') || document.querySelector('[id*="epub"]');
                                        if (container) {
                                            iframe = container.querySelector('iframe');
                                        }
                                    }
                                    
                                    if (iframe) {
                                        const currentSandbox = iframe.getAttribute('sandbox') || '';
                                        
                                        if (!currentSandbox.includes('allow-scripts')) {
                                            const newSandbox = currentSandbox 
                                                ? `${currentSandbox} allow-scripts allow-same-origin` 
                                                : 'allow-scripts allow-same-origin';
                                            iframe.setAttribute('sandbox', newSandbox);
                                            
                                        } else {
                                        }
                                    } else {
                                    }
                                } catch (error) {
                                    console.warn('Could not modify iframe sandbox:', error);
                                }
                            };
                            
                            // Try to modify iframe immediately and also after delays
                            modifyIframeSandbox();
                            setTimeout(modifyIframeSandbox, 100);
                            setTimeout(modifyIframeSandbox, 500);
                            setTimeout(modifyIframeSandbox, 1000);
                            
                            // Also try when content is rendered
                            rendition.on('rendered', () => {
                                setTimeout(modifyIframeSandbox, 100);
                            });
                        }
                        
                        // Store book reference if available
                        if (rendition && rendition.book) {
                            bookRef.current = rendition.book;
                            
                            // Initialize locations for progress calculation
                            const initLocations = async () => {
                                try {
                                    const locations = rendition.book.locations;
                                    const getLocationsLength = () => {
                                        if (typeof locations?.length === 'function') {
                                            return locations.length();
                                        }
                                        return locations?.length || 0;
                                    };
                                    
                                    const currentLength = getLocationsLength();
                                    if (locations && currentLength === 0) {
                                        await locations.generate(1024);
                                        // Wait a bit for generation
                                        let attempts = 0;
                                        let newLength = getLocationsLength();
                                        while (attempts < 30 && newLength === 0) {
                                            await new Promise(resolve => setTimeout(resolve, 100));
                                            newLength = getLocationsLength();
                                            attempts++;
                                        }
                                    }
                                } catch (error) {
                                    console.warn('Could not initialize locations:', error);
                                }
                            };
                            
                            // Load chapters when book is available
                            setTimeout(() => {
                                loadChapters();
                                initLocations();
                            }, 500);
                        }
                        
                        // Apply settings when rendition is ready
                        if (rendition) {
                            applySettings(settings);
                        }
                        
                        // Display saved location if available
                        if (location && rendition) {
                            rendition.display(location);
                            
                            // Recalculate progress for the saved location after book is ready
                            // This ensures progress is accurate without resetting to 0
                            setTimeout(async () => {
                                if (location && bookRef.current && bookRef.current.locations) {
                                    // Calculate progress without updating display immediately
                                    // Only update if we get a valid result > 0
                                    const newProgress = await calculateProgressFromCfi(location, false);
                                    if (newProgress !== null && newProgress > 0) {
                                        // Only update if new progress is valid and greater than 0
                                        // This prevents resetting to 0 when book first loads
                                        progressRef.current = newProgress;
                                        setProgress(newProgress);
                                    }
                                }
                            }, 1500); // Wait a bit for locations to be ready
                        }
                        
                        // Set up navigation handlers
                        if (rendition) {
                            rendition.on('relocated', (loc) => {
                                if (loc?.start?.cfi) {
                                    handleLocationChange(loc.start.cfi);
                                }
                            });
                            
                            // Function to attach link handlers to a document
                            const attachLinkHandlers = (doc) => {
                                if (!doc) return;
                                
                                // Find all anchors and replace href with data-href to prevent browser navigation
                                const anchors = doc.querySelectorAll('a[href]');
                                
                                anchors.forEach((anchor) => {
                                    const href = anchor.getAttribute('href') || anchor.href;
                                    
                                    // Only process EPUB internal links
                                    if (href && (
                                        (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:')) ||
                                        (href.includes('OEBPS/') || href.includes('.htm') || href.includes('.xhtml'))
                                    )) {
                                        // Store original href in data attribute
                                        anchor.setAttribute('data-epub-href', href);
                                        // Remove or empty href to prevent browser navigation
                                        anchor.removeAttribute('href');
                                        // Add cursor pointer style
                                        anchor.style.cursor = 'pointer';
                                        
                                        
                                        // Attach click handler
                                        anchor.addEventListener('click', (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            e.stopImmediatePropagation();
                                            
                                            const epubHref = anchor.getAttribute('data-epub-href') || href;
                                            
                                            
                                            // Navigate using our handler
                                            handleGoToChapter(epubHref);
                                            
                                            return false;
                                        }, true);
                                    }
                                });
                                
                                // Also use event delegation as backup
                                const handleClick = (e) => {
                                    const anchor = e.target.closest('a[data-epub-href]');
                                    if (anchor) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        e.stopImmediatePropagation();
                                        
                                        const epubHref = anchor.getAttribute('data-epub-href');
                                        
                                        
                                        if (epubHref) {
                                            handleGoToChapter(epubHref);
                                        }
                                        
                                        return false;
                                    }
                                };
                                
                                doc.removeEventListener('click', handleClick, true);
                                doc.addEventListener('click', handleClick, true);
                            };
                            
                            // Handle link clicks inside the book (e.g., TOC links)
                            // Register hook that runs every time content is rendered
                            rendition.hooks.content.register((view) => {
                                
                                if (view && view.document) {
                                    
                                    // Wait a bit for DOM to be ready, then attach handlers
                                    setTimeout(() => {
                                        attachLinkHandlers(view.document);
                                    }, 100);
                                }
                            });
                            
                            // Also attach handlers when content is displayed
                            rendition.on('rendered', (section) => {
                                
                                if (section && section.document) {
                                    setTimeout(() => {
                                        attachLinkHandlers(section.document);
                                    }, 100);
                                }
                            });
                            
                            // Also try the 'link' event as fallback
                            rendition.on('link', (href) => {
                                
                                if (href) {
                                    handleGoToChapter(href);
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

            {/* Settings Panel */}
            {showSettings && (
                <ReaderSettings
                    settings={settings}
                    onSettingsChange={handleSettingsChange}
                    onClose={() => {
                        // Clear saved CFI when closing settings
                        savedCfiBeforeSettingsRef.current = null;
                        setShowSettings(false);
                    }}
                    chapters={chapters}
                    onGoToChapter={handleGoToChapter}
                />
            )}
        </div>
    );
}

