require('dotenv').config();
const express  = require('express');
const app = express();
const path = require('path');
const hbs = require('hbs');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

require("./db/conn"); 
const Register = require("./models/registers");
const QuizResult = require("./models/quizResults");

const port = process.env.PORT || 5005;

// paths
const static_path = path.join(__dirname, "../frontend/public");
const template_path = path.join(__dirname, "../frontend/views");
const partials_path = path.join(__dirname, "../frontend/partials");

// view engine setup
app.set("view engine", "hbs");
app.set("views", template_path);
hbs.registerPartials(partials_path);

// Middleware
app.use(express.static(static_path));
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'brainbyte-secret-key',
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// HBS helpers
hbs.registerHelper('gte', (a, b) => a >= b);

// auth middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.userEmail) return next();
    res.redirect('/login');
};

// passport config
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, cb) => {
    try {
        let user = await Register.findOne({ googleId: profile.id });
        if (!user) {
            user = await Register.findOne({ email: profile.emails[0].value });
            if (user) {
                user.googleId = profile.id;
                await user.save();
            } else {
                user = new Register({
                    username: profile.displayName,
                    email: profile.emails[0].value,
                    googleId: profile.id
                });
                await user.save();
            }
        }
        return cb(null, user);
    } catch (err) {
        return cb(err, null);
    }
  }
));

passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((obj, cb) => cb(null, obj));

// ========== ROUTES ==========

// Auth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    req.session.userEmail = req.user.email;
    res.redirect('/dashboard');
  }
);

// Landing
app.get('/', (req, res) => {
    if (req.session.userEmail) return res.redirect('/dashboard');
    res.render('index', { title: 'BrainByte — Master Computer Science', userEmail: null });
});

app.get('/login', (req, res) => {
    if (req.session.userEmail) return res.redirect('/dashboard');
    res.render('login', { title: 'Login — BrainByte' });
});

app.get('/register', (req, res) => {
    if (req.session.userEmail) return res.redirect('/dashboard');
    res.render('register', { title: 'Register — BrainByte' });
});

// Dashboard
app.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const userEmail = req.session.userEmail;
        const allResults = await QuizResult.find({ userEmail }).sort({ attemptedAt: 1 }).lean();
        const recentResults = [...allResults].reverse().slice(0, 10);
        recentResults.forEach(r => {
            r.dateString = new Date(r.attemptedAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        });

        let totalAttempts = allResults.length;
        let bestScore = 0;
        let totalStats = { score: 0, questions: 0 };
        const subjectAverages = {};

        allResults.forEach(r => {
            if (r.percentage > bestScore) bestScore = r.percentage;
            totalStats.score += r.score;
            totalStats.questions += r.totalQuestions;
            if (!subjectAverages[r.subject]) subjectAverages[r.subject] = { totalPct: 0, count: 0 };
            subjectAverages[r.subject].totalPct += r.percentage;
            subjectAverages[r.subject].count += 1;
        });

        const accuracyRate = totalAttempts > 0 ? Math.round((totalStats.score / totalStats.questions) * 100) : 0;
        let weakTopic = "None";
        let lowestAvg = 101;
        for (const sub in subjectAverages) {
            const avg = subjectAverages[sub].totalPct / subjectAverages[sub].count;
            if (avg < lowestAvg) { lowestAvg = avg; weakTopic = sub; }
        }

        const chartData = allResults.slice(-10).map(r => ({
            label: new Date(r.attemptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: r.percentage
        }));

        res.render('dashboard', {
            title: 'Dashboard — BrainByte',
            userEmail,
            firstLetter: userEmail.charAt(0).toUpperCase(),
            isDashboard: true,
            quizResults: recentResults,
            totalAttempts, bestScore, accuracyRate, weakTopic,
            chartDataJSON: JSON.stringify(chartData)
        });
    } catch (error) {
        res.render('dashboard', { title: 'Dashboard — BrainByte', userEmail: req.session.userEmail, firstLetter: 'U', isDashboard: true, quizResults: [], totalAttempts: 0, bestScore: 0, accuracyRate: 0, weakTopic: "None", chartDataJSON: "[]" });
    }
});

// ========== QUESTION BANK ==========
const questionBank = {
    osmcq: {
        subject: 'Operating System', title: 'Operating System MCQ',
        questions: [
            { question: 'In Operating Systems, which of the following is/are CPU scheduling algorithms?', options: ['Priority', 'Round Robin', 'Shortest Job First', 'All of the mentioned'], correct: 3 },
            { question: 'Which of the following can cause an external interrupt?', options: ['Lack of paper in printer', 'Connection failure in the network', 'Power failure', 'All of the mentioned'], correct: 3 },
            { question: 'Which type of OS reads and reacts in terms of actual time?', options: ['Quick sharing OS', 'Time sharing OS', 'Real Time OS', 'Batch OS'], correct: 2 },
            { question: 'Which of the following schedules threads?', options: ['Virtual Memory', 'Operating System', 'CPU', 'Input'], correct: 1 },
            { question: 'The main memory accommodates ____________?', options: ['CPU', 'User processes', 'Operating system', 'All of the mentioned'], correct: 2 }
        ]
    },
    software: {
        subject: 'Software Engineering', title: 'Software Engineering MCQ',
        questions: [
            { question: 'By whom is unit testing done?', options: ['Users', 'Customers', 'Developers', 'None'], correct: 2 },
            { question: 'In which category can white-box testing be classified?', options: ['Design based testing', 'Structural Testing', 'Error guessing technique', 'All of the mentioned'], correct: 1 },
            { question: 'Identify the simplest model of SDLC?', options: ['Agile', 'RAD', 'Waterfall', 'Spiral'], correct: 3 },
            { question: 'Which of the following is the first step of SDLC?', options: ['Coding', 'Design', 'Preliminary Investigation and Analysis', 'Testing'], correct: 2 },
            { question: 'The SRS document is also known as _____________ specification.', options: ['Black box', 'White box', 'Grey box', 'None'], correct: 0 }
        ]
    },
    cn: {
        subject: 'Computer Networks', title: 'Computer Networks MCQ',
        questions: [
            { question: 'The full form of OSI is?', options: ['Operating System Interface', 'Operating System Interconnection', 'Operating System Internet', 'Open System Interconnection'], correct: 3 },
            { question: 'What is the number of layers in the OSI model?', options: ['2 layers', '4 layers', '7 layers', '9 layers'], correct: 2 },
            { question: 'Choose the most common internet protocol.', options: ['PPP', 'FTP', 'TCP/IP', 'SMTP'], correct: 2 },
            { question: 'What does TCP/IP stand for?', options: ['Telephone control protocol/Internet protocol', 'Transmission control protocol/Internet protocol', 'Transmission control protocol/International protocol', 'None'], correct: 1 },
            { question: 'Identify the layer which provides service to the user.', options: ['Session layer', 'Application layer', 'Presentation layer', 'Physical layer'], correct: 1 }
        ]
    },
    dsa: {
        subject: 'Data Structures & Algorithms', title: 'Data Structures & Algorithms MCQ',
        questions: [
            { question: 'Which data structure uses LIFO (Last In First Out)?', options: ['Queue', 'Stack', 'Linked List', 'Array'], correct: 1 },
            { question: 'What is the time complexity of binary search?', options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'], correct: 2 },
            { question: 'Which sorting algorithm has the best average-case time complexity?', options: ['Bubble Sort', 'Selection Sort', 'Quick Sort', 'Insertion Sort'], correct: 2 },
            { question: 'A full binary tree with n leaves has how many nodes?', options: ['n', '2n', '2n − 1', '2n + 1'], correct: 2 },
            { question: 'Which data structure is used for BFS traversal?', options: ['Stack', 'Queue', 'Array', 'Linked List'], correct: 1 }
        ]
    },
    dbms: {
        subject: 'DBMS', title: 'Database Management System MCQ',
        questions: [
            { question: 'Which of the following is not a type of database?', options: ['Hierarchical', 'Network', 'Distributed', 'Decentralized'], correct: 3 },
            { question: 'ACID properties ensure _________ in a database transaction.', options: ['Speed', 'Reliability', 'Storage', 'Connectivity'], correct: 1 },
            { question: 'What does SQL stand for?', options: ['Structured Query Language', 'Simple Query Language', 'Standard Query Language', 'Sequential Query Language'], correct: 0 },
            { question: 'Which normal form removes transitive dependency?', options: ['1NF', '2NF', '3NF', 'BCNF'], correct: 2 },
            { question: 'Primary key is a type of _________ constraint.', options: ['Domain', 'Entity integrity', 'Referential integrity', 'None'], correct: 1 }
        ]
    },
    AI: {
        subject: 'Artificial Intelligence', title: 'Artificial Intelligence MCQ',
        questions: [
            { question: 'Who is known as the father of Artificial Intelligence?', options: ['Alan Turing', 'John McCarthy', 'Charles Babbage', 'Marvin Minsky'], correct: 1 },
            { question: 'Which search algorithm uses a heuristic function?', options: ['BFS', 'DFS', 'A* Search', 'Linear Search'], correct: 2 },
            { question: 'What is a perceptron?', options: ['A database', 'A single-layer neural network', 'A sorting algorithm', 'An OS process'], correct: 1 },
            { question: 'Which technique is used in Natural Language Processing?', options: ['Tokenization', 'Compilation', 'Fragmentation', 'Normalization'], correct: 0 },
            { question: 'Expert systems are part of which AI domain?', options: ['Robotics', 'Knowledge-based systems', 'Computer Vision', 'Speech Recognition'], correct: 1 }
        ]
    },
    ca: {
        subject: 'Computer Architecture', title: 'Computer Architecture MCQ',
        questions: [
            { question: 'Which unit performs arithmetic and logic operations?', options: ['Control Unit', 'ALU', 'Memory Unit', 'Register'], correct: 1 },
            { question: 'What is pipelining?', options: ['Parallel data storage', 'Overlapping execution of instructions', 'Memory allocation', 'Cache management'], correct: 1 },
            { question: 'Which memory is the fastest?', options: ['RAM', 'Hard Disk', 'Cache', 'SSD'], correct: 2 },
            { question: 'RISC stands for?', options: ['Reduced Instruction Set Computer', 'Random Instruction Set Computer', 'Rapid Instruction Set Computer', 'None'], correct: 0 },
            { question: 'The instruction cycle consists of?', options: ['Fetch and Execute', 'Read and Write', 'Load and Store', 'Input and Output'], correct: 0 }
        ]
    },
    c: {
        subject: 'C Programming', title: 'C Programming MCQ',
        questions: [
            { question: 'What will happen when two variables with the same name are declared in the same scope in C?', options: ['Compile time error', 'Hello World! 34', 'Hello World! 1000', 'Hello World! followed by a junk value'], correct: 0 },
            { question: 'What is the output when using %f for float and %d for int with scanf using %f for both?', options: ['7.000000, 7', 'Run time error', '7.000000, junk value', 'Varies'], correct: 2 },
            { question: 'What is the output of (++i)++ in C?', options: ['3', '4', '5', 'Compile-time error'], correct: 3 },
            { question: 'Which of the following is not a logical operator?', options: ['&&', '!', '||', '|'], correct: 3 },
            { question: 'What is the scope behavior with nested blocks in C?', options: ['Inner block variable shadows outer', 'Outer block variable overrides inner', 'Both are accessible', 'None of the above'], correct: 0 }
        ]
    },
    cpp: {
        subject: 'C++ / OOP', title: 'C++ / OOP MCQ',
        questions: [
            { question: 'Which feature of OOP indicates code reusability?', options: ['Encapsulation', 'Inheritance', 'Abstraction', 'Polymorphism'], correct: 1 },
            { question: 'Which is not a type of constructor in C++?', options: ['Default', 'Parameterized', 'Copy', 'Friend'], correct: 3 },
            { question: 'What is the use of the "virtual" keyword?', options: ['Memory allocation', 'Runtime polymorphism', 'Compile time binding', 'Operator overloading'], correct: 1 },
            { question: 'STL stands for?', options: ['Standard Template Library', 'Simple Type Language', 'System Template Linker', 'None'], correct: 0 },
            { question: 'Multiple inheritance is supported in?', options: ['Java', 'C#', 'C++', 'Python only'], correct: 2 }
        ]
    }
};

const renderQuiz = (res, req, quizKey) => {
    const quiz = questionBank[quizKey];
    const userEmail = req.session.userEmail;
    res.render('quiz', { 
        quizTitle: quiz.title, 
        quizSubject: quiz.subject, 
        totalQ: quiz.questions.length, 
        questionsJSON: JSON.stringify(quiz.questions),
        userEmail,
        firstLetter: userEmail.charAt(0).toUpperCase()
    });
};

// Quiz Routes
app.get('/osmcq', isAuthenticated, (req, res) => renderQuiz(res, req, 'osmcq'));
app.get('/software', isAuthenticated, (req, res) => renderQuiz(res, req, 'software'));
app.get('/AI', isAuthenticated, (req, res) => renderQuiz(res, req, 'AI'));
app.get('/cn', isAuthenticated, (req, res) => renderQuiz(res, req, 'cn'));
app.get('/dsa', isAuthenticated, (req, res) => renderQuiz(res, req, 'dsa'));
app.get('/dbms', isAuthenticated, (req, res) => renderQuiz(res, req, 'dbms'));
app.get('/c', isAuthenticated, (req, res) => renderQuiz(res, req, 'c'));
app.get('/cpp', isAuthenticated, (req, res) => renderQuiz(res, req, 'cpp'));
app.get('/ca', isAuthenticated, (req, res) => renderQuiz(res, req, 'ca'));
app.get('/allsub', isAuthenticated, (req, res) => {
    const userEmail = req.session.userEmail;
    res.render('allsub', { 
        title: 'All Subjects — BrainByte', 
        userEmail,
        firstLetter: userEmail.charAt(0).toUpperCase(),
        isAllSub: true
    });
});

// API
app.post('/api/quiz-result', isAuthenticated, async (req, res) => {
    try {
        const { subject, score, totalQuestions } = req.body;
        const result = new QuizResult({ userEmail: req.session.userEmail, subject, score, totalQuestions, percentage: Math.round((score / totalQuestions) * 100) });
        await result.save();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// Login/Register POST
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Register.findOne({ email, password });
        if(user) { req.session.userEmail = email; res.redirect('/dashboard'); }
        else { res.render('login', { error: 'Invalid email or password' }); }
    } catch(error) { res.render('login', { error: "Error logging in" }); }
});

app.post('/register', async (req, res) => {
    try{
        const { username, email, password, confirmpassword } = req.body;
        if(password === confirmpassword){
            const user = new Register({ username, email, password, confirmpassword });
            await user.save();
            req.session.userEmail = email;
            res.redirect('/dashboard');
        } else { res.render('register', { error: 'Passwords are not matching' }); }
    } catch(error) { res.render('register', { error: 'Error during registration' }); }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// 404 Catch-all
app.use((req, res) => {
    res.status(404).render('index', { 
        title: '404 - Page Not Found', 
        userEmail: req.session.userEmail,
        error: 'The page you are looking for does not exist.' 
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('index', { 
        title: '500 - Server Error', 
        userEmail: req.session.userEmail,
        error: 'Something went wrong on our end. Please try again later.' 
    });
});

app.listen(port, () => console.log(`Server running at ${port}`));