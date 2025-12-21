const fs = require('fs').promises;
const path = require('path');

class FileService {
    // Get file type from extension
    getFileType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const typeMap = {
            '.pdf': 'pdf',
            '.epub': 'epub',
            '.txt': 'txt'
        };
        return typeMap[ext] || null;
    }

    // Check if file exists
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    // Read text file
    async readTextFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return {
                text: content,
                available: true
            };
        } catch (error) {
            throw new Error(`Error reading file: ${error.message}`);
        }
    }

    // Read PDF file (basic implementation - would need pdf-parse library for full support)
    async readPdfFile(filePath) {
        // For now, return a message that PDF reading requires additional library
        // In production, you'd use pdf-parse or pdfjs-dist
        return {
            text: null,
            available: false,
            message: 'PDF text extraction requires pdf-parse library. File is stored but text reading is not yet implemented.',
            filePath: filePath
        };
    }

    // Read EPUB file (basic implementation - would need epub library for full support)
    async readEpubFile(filePath) {
        // For now, return a message that EPUB reading requires additional library
        // In production, you'd use epub library
        return {
            text: null,
            available: false,
            message: 'EPUB text extraction requires epub library. File is stored but text reading is not yet implemented.',
            filePath: filePath
        };
    }

    // Get book content based on file type
    async getBookContent(filePath, fileType) {
        switch (fileType) {
            case 'txt':
                return await this.readTextFile(filePath);
            case 'pdf':
                return await this.readPdfFile(filePath);
            case 'epub':
                return await this.readEpubFile(filePath);
            default:
                throw new Error('Unsupported file type');
        }
    }

    // Delete file
    async deleteFile(filePath) {
        try {
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    // Get file size
    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch {
            return 0;
        }
    }
}

module.exports = new FileService();

