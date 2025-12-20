import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';

export default function Upload() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.name.endsWith('.epub')) {
            setFile(selectedFile);
        } else {
            alert('Please select an EPUB file');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('epub', file);

        setUploading(true);
        setProgress(0);

        try {
            await api.post('/books/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setProgress(percentCompleted);
                }
            });

            alert('Book uploaded successfully!');
            navigate('/shelves');
        } catch (error) {
            console.error('Upload error:', error);
            alert(error.response?.data?.message || 'Failed to upload book');
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold mb-6">Upload Book</h1>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Upload EPUB File</CardTitle>
                        <CardDescription>
                            Upload your own EPUB file to add it to your library
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select EPUB File
                            </label>
                            <input
                                type="file"
                                accept=".epub"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-md file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-blue-50 file:text-blue-700
                                    hover:file:bg-blue-100"
                                disabled={uploading}
                            />
                        </div>

                        {file && (
                            <div className="p-4 bg-gray-50 rounded-md">
                                <p className="text-sm text-gray-600">
                                    Selected: <span className="font-medium">{file.name}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        )}

                        {uploading && (
                            <div className="space-y-2">
                                <Progress value={progress} />
                                <p className="text-sm text-gray-600 text-center">
                                    Uploading... {progress}%
                                </p>
                            </div>
                        )}

                        <Button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="w-full"
                        >
                            {uploading ? 'Uploading...' : 'Upload Book'}
                        </Button>
                    </CardContent>
                </Card>
        </div>
    );
}

