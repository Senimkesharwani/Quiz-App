const express  = require('express');
const app = express();
const path = require('path');
const hbs = require('hbs');

const session = require('express-session');

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));


require("./db/conn"); 

const Register = require("./models/registers");

const port = process.env.PORT || 5005;

// connect .html file with express to run html file on server 
const static_path = path.join(__dirname, "../public");
const template_path = path.join(__dirname, "../templates/views");
const partials_path = path.join(__dirname, "../templates/partials");

// Middleware to serve static files
app.use(express.static(static_path));

// this is used for folder(views) to read "hbs" file
app.set("view engine", "hbs");

app.set("views", template_path);
hbs.registerPartials(partials_path);


// to perform POST, PUT operation using this middleware
app.use(express.json());
// this used to -> not give undefined answer by making it false
app.use(express.urlencoded({extended:false}));

app.get('/', (req, res) => {
    // Check if user is logged in
    if (req.session.userEmail) {
        // User is logged in, render homepage with user's email
        res.render('index2', { title: 'Home Page', userEmail: req.session.userEmail });
    } else {
        // User is not logged in, render homepage without user's email
        res.render('index1', { title: 'Home Page', userEmail: null });
    }
});


// demo home page
app.get('/index1', (req, res) => {
    res.render('index1', { title: 'Home Page' });
});

// responsive home
app.get('/index2', (req, res) => {
    res.render('index2', { title: 'Home Page' });
});

app.get('/login', (req, res) => {
    res.render('login', { title: 'Login Page' });
});

app.get('/register', (req, res) => {
    res.render('register', { title: 'Registration Page' });
});

app.get('/osmcq', (req, res) => {
    res.render('osmcq', { title: 'OS MCQ Page' });
});

app.get('/software', (req, res) => {
    res.render('software', { title: 'Software Engineering MCQ Page' });
});

app.get('/AI', (req, res) => {
    res.render('AI', { title: 'Artificial Intelligence MCQ Page' });
});

app.get('/cn', (req, res) => {
    res.render('cn', { title: 'Computer Networks MCQ Page' });
});

app.get('/dsa', (req, res) => {
    res.render('dsa', { title: 'Computer Networks MCQ Page' });
});

app.get('/dbms', (req, res) => {
    res.render('dbms', { title: 'Computer Networks MCQ Page' });
});

app.get('/c', (req, res) => {
    res.render('c', { title: 'Computer Networks MCQ Page' });
});

app.get('/cpp', (req, res) => {
    res.render('cpp', { title: 'cpp MCQ Page' });
});

app.get('/ca', (req, res) => {
    res.render('ca', { title: 'cpp MCQ Page' });
});

app.get('/allsub', (req, res) => {
    res.render('allsub', { title: 'All subject MCQ' });
});

// post method for Login
// post method for Login
app.post('/login', async(req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const user = await Register.findOne({ email: email, password: password });
        
        if(user) {
            // Set a session variable to store the user's email
            req.session.userEmail = email;
            res.redirect('/');
        } else {
            res.send("Invalid email or password");
        }

    } catch(error) {
        res.status(400).send("Error logging in: " + error.message);
    }
});


// create a new user in our database using post for register(sign up)
app.post('/register', async(req, res) => {
    try{
        const password = req.body.password;
        const cpassword = req.body.confirmpassword;

        if(password === cpassword){
            const registerEmployee = new Register({
                username : req.body.username,
                email : req.body.email,
                password : password,
                confirmpassword : cpassword
            });

            // save the data
            const registered = await registerEmployee.save();

            // Set a session variable to store the user's email
            req.session.userEmail = req.body.email;

            res.redirect('/');

        }else{
            res.send("password are not matching");
        }
    }catch(error){
        res.status(400).send(error);
    }
});



app.listen(port, () =>{
    console.log(`server is running at port ${port}`);
});