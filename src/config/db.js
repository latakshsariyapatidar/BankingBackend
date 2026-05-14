const mongoose = require("mongoose");

function connectToDB(){

    mongoose.connect(process.env.MONGO_URI)
    .then(()=> {
        console.log("Server connected to database successfully");
    })
    .catch((err) => {
        console.log("Server failed to connect: " + err.message);
        process.exit(1)
    })
     
}

module.exports = connectToDB;