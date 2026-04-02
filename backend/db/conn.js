const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log(`Connection Successful to MongoDB Atlas`);
}).catch((err) => {
    console.log(`No connection: ${err.message}`);
});
