// Frontend Configuration
// This file can be modified to match your deployment environment

window.RAG_CONFIG = {
    // API URL - Change this to match your backend URL
    // Examples:
    // - Local: 'http://localhost:8000'
    // - Docker: 'http://localhost:8000'
    // - Production: 'https://api.yourdomain.com'
    API_URL: 'http://localhost:8000',
    
    // Collection name for storing documents
    COLLECTION_NAME: 'learning_materials',
    
    // Supported file extensions
    SUPPORTED_EXTENSIONS: ['.pdf', '.txt', '.text', '.md', '.markdown'],
    
    // UI Settings
    MAX_FILE_SIZE_MB: 50,
    
    // Search settings
    DEFAULT_SEARCH_LIMIT: 8
};
