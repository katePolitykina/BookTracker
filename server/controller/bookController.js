// Импортируем Модель (наш чертеж книги)
const Book = require('../models/Book');

// 1. Получить все книги
exports.getBooks = async (req, res) => {
    try {
        // .find() — это команда Mongoose "найди всё"
        const books = await Book.find();

        // Отправляем ответ в формате JSON (список книг)
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// 2. Добавить книгу
exports.createBook = async (req, res) => {
    try {
        // req.body — это данные, которые прислал пользователь
        const newBook = new Book(req.body);

        // Сохраняем в базу
        const savedBook = await newBook.save();

        // 201 — код "Успешно создано"
        res.status(201).json(savedBook);
    } catch (error) {
        res.status(400).json({ message: "Ошибка при создании", error });
    }
};

// 3. Обновить книгу (например, изменить страницу или статус)
exports.updateBook = async (req, res) => {
    try {
        // req.params.id — это ID книги из адресной строки
        // { new: true } — значит "верни мне уже обновленную версию"
        const updatedBook = await Book.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedBook);
    } catch (error) {
        res.status(400).json({ message: "Ошибка обновления" });
    }
};

// 4. Удалить книгу
exports.deleteBook = async (req, res) => {
    try {
        await Book.findByIdAndDelete(req.params.id);
        res.json({ message: "Книга удалена" });
    } catch (error) {
        res.status(500).json({ message: "Ошибка удаления" });
    }
};