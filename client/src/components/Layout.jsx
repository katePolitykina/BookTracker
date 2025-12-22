import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { LogOut, Trash2, ChevronDown, User as UserIcon } from 'lucide-react';

export default function Layout({ children }) {
    const { user, logout, deleteAccount } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Закрываем меню при клике вне его
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone. All your books and reading data will be lost.')) {
            const result = await deleteAccount();
            if (!result.success) {
                alert(result.message);
            } else {
                navigate('/login');
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b relative z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">Bookcamp</h1>
                        <nav className="flex items-center gap-6">
                            <Link to="/dashboard" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Dashboard</Link>
                            <Link to="/search" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Search</Link>
                            <Link to="/upload" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Upload</Link>
                            <Link to="/shelves" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Shelves</Link>

                            {/* User Dropdown */}
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none"
                                >

                                    <span className="hidden sm:inline-block">{user?.email}</span>
                                    <ChevronDown size={16} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-100 ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                                            <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                                        </div>

                                        <button
                                            onClick={logout}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <LogOut size={16} />
                                            Sign out
                                        </button>

                                        <button
                                            onClick={handleDelete}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <Trash2 size={16} />
                                            Delete Account
                                        </button>
                                    </div>
                                )}
                            </div>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main>
                {children}
            </main>
        </div>
    );
}