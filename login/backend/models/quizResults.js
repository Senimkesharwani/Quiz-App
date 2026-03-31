const mongoose = require("mongoose");

const quizResultSchema = new mongoose.Schema({
    userEmail: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    percentage: {
        type: Number,
        required: true
    },
    attemptedAt: {
        type: Date,
        default: Date.now
    }
});

const QuizResult = mongoose.model("QuizResult", quizResultSchema);

module.exports = QuizResult;
