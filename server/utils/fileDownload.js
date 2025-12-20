const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Download file from URL and save to local path
const downloadFile = async (url, filePath) => {
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        
        // Download file
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        
        // Write to file
        const writer = require('fs').createWriteStream(filePath);
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('File download error:', error);
        throw new Error('Failed to download file');
    }
};

module.exports = {
    downloadFile
};

