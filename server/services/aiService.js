const UserBookState = require('../models/UserBookState');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Мок-данные с жанрами (резервный вариант)
const getMockRecommendations = () => {
    return [
        {
            genre: "Классическая проза",
            books: [
                {
                    title: "Pride and Prejudice",
                    author: "Jane Austen",
                    reason: "Шедевр английской литературы о любви и манерах.",
                    gutenbergId: "1342"
                },
                {
                    title: "Great Expectations",
                    author: "Charles Dickens",
                    reason: "Глубокая история о надеждах и разочарованиях.",
                    gutenbergId: "1400"
                }
            ]
        },
        {
            genre: "Приключения",
            books: [
                {
                    title: "Moby Dick",
                    author: "Herman Melville",
                    reason: "Эпическая погоня за белым китом.",
                    gutenbergId: "2701"
                },
                {
                    title: "Treasure Island",
                    author: "Robert Louis Stevenson",
                    reason: "Классика пиратских приключений.",
                    gutenbergId: "120"
                }
            ]
        },
        {
            genre: "Фантастика и Мистика",
            books: [
                {
                    title: "Frankenstein",
                    author: "Mary Shelley",
                    reason: "История о границах науки и человечности.",
                    gutenbergId: "84"
                },
                {
                    title: "Dracula",
                    author: "Bram Stoker",
                    reason: "Атмосферный готический роман.",
                    gutenbergId: "345"
                }
            ]
        }
    ];
};

const getRecommendations = async (userId) => {
    try {
        // Ищем последние 10 книг с рейтингом >= 4
        const highlyRatedBooks = await UserBookState.find({
            user: userId,
            rating: { $gte: 4 }
        })
            .sort({ updatedAt: -1 })
            .limit(10)
            .populate('book');

        if (highlyRatedBooks.length === 0) {
            return getMockRecommendations();
        }

        const geminiApiKey = process.env.GEMINI_API_KEY;

        if (!geminiApiKey) {
            console.warn('GEMINI_API_KEY not found, using mock data');
            return getMockRecommendations();
        }

        const bookList = highlyRatedBooks.map(state =>
            `- "${state.book.title}" by ${state.book.author}`
        ).join('\n');

        // Промпт для Gemini
        const prompt = `User liked the following books (rated 4 or 5 stars):
${bookList}

Based on these preferences, identify the top 3 distinct genres or themes the user enjoys.
For EACH genre, suggest 3-5 public domain books available on Project Gutenberg (must provide Gutenberg ID).

Return ONLY a valid JSON array (no markdown) with this structure:
[
  {
    "genre": "Genre Name (e.g. Science Fiction)",
    "books": [
      {
        "title": "Book Title",
        "author": "Author Name",
        "reason": "Book Description",
        "gutenbergId": "1234"
      }
    ]
  }
]`;

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Очистка от markdown форматирования
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const recommendations = JSON.parse(text);

        if (!Array.isArray(recommendations)) return getMockRecommendations();

        return recommendations.slice(0, 3); // Возвращаем только 3 жанра

    } catch (error) {
        console.error('Error getting recommendations:', error);
        return getMockRecommendations();
    }
};

module.exports = {
    getRecommendations
};