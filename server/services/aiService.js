const UserBookState = require('../models/UserBookState');
const LibraryBook = require('../models/LibraryBook');

// Mock recommendations for fallback when OpenAI is not available
const getMockRecommendations = () => {
    return [
        {
            title: "Pride and Prejudice",
            author: "Jane Austen",
            reason: "A classic romance novel that explores themes of love, class, and social expectations.",
            gutenbergId: "1342"
        },
        {
            title: "Moby Dick",
            author: "Herman Melville",
            reason: "An epic tale of obsession and revenge on the high seas.",
            gutenbergId: "2701"
        },
        {
            title: "The Adventures of Sherlock Holmes",
            author: "Arthur Conan Doyle",
            reason: "A collection of detective stories featuring the brilliant Sherlock Holmes.",
            gutenbergId: "1661"
        },
        {
            title: "Dracula",
            author: "Bram Stoker",
            reason: "The classic gothic horror novel that defined the vampire genre.",
            gutenbergId: "345"
        },
        {
            title: "The Picture of Dorian Gray",
            author: "Oscar Wilde",
            reason: "A philosophical novel exploring beauty, morality, and the consequences of vanity.",
            gutenbergId: "174"
        }
    ];
};

const getRecommendations = async (userId) => {
    try {
        // Find last 5 books with rating >= 4
        const highlyRatedBooks = await UserBookState.find({
            user: userId,
            rating: { $gte: 4 }
        })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate('book');
        
        // If no highly rated books, return mock recommendations
        if (highlyRatedBooks.length === 0) {
            return getMockRecommendations();
        }
        
        // Check if OpenAI API key is available
        const openaiApiKey = process.env.OPENAI_API_KEY;
        
        if (!openaiApiKey) {
            // Return mock recommendations if no API key
            return getMockRecommendations();
        }
        
        // Build prompt with user's favorite books
        const bookList = highlyRatedBooks.map(bookState => {
            const book = bookState.book;
            return `- "${book.title}" by ${book.author}`;
        }).join('\n');
        
        const prompt = `User liked the following books (rated 4 or 5 stars):
${bookList}

Based on these preferences, suggest 5 public domain books available on Project Gutenberg that the user might enjoy. 
For each book, provide:
- title: The book title
- author: The author's name
- reason: A brief explanation (1-2 sentences) why this book matches their preferences
- gutenbergId: An approximate Project Gutenberg ID (if you know one, otherwise use a reasonable guess)

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Book Title",
    "author": "Author Name",
    "reason": "Why this book matches",
    "gutenbergId": "1234"
  }
]`;

        // Call OpenAI API
        let recommendations;
        try {
            // Try to require openai package (optional dependency)
            let OpenAI;
            try {
                OpenAI = require('openai');
            } catch (requireError) {
                // If openai package is not installed, fall through to mock recommendations
                throw new Error('OpenAI package not installed');
            }
            
            const openai = new OpenAI({ apiKey: openaiApiKey });
            
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful librarian assistant. Always return valid JSON arrays."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });
            
            const responseText = completion.choices[0].message.content.trim();
            
            // Try to parse JSON from response
            // Sometimes the response might have markdown code blocks
            let jsonText = responseText;
            if (responseText.startsWith('```')) {
                jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            }
            
            recommendations = JSON.parse(jsonText);
            
            // Validate recommendations structure
            if (!Array.isArray(recommendations)) {
                throw new Error('Response is not an array');
            }
            
            // Ensure all recommendations have required fields
            recommendations = recommendations
                .filter(rec => rec.title && rec.author && rec.reason)
                .slice(0, 5); // Limit to 5
            
            // If we got valid recommendations, return them
            if (recommendations.length > 0) {
                return recommendations;
            }
        } catch (openaiError) {
            console.error('OpenAI API error:', openaiError);
            // Fall through to mock recommendations
        }
        
        // Fallback to mock recommendations
        return getMockRecommendations();
        
    } catch (error) {
        console.error('Error getting recommendations:', error);
        // Return mock recommendations on any error
        return getMockRecommendations();
    }
};

module.exports = {
    getRecommendations
};

