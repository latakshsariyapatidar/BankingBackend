const express = require ("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Requiring the routes from their respective files
const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/account.routes");
const transactionRoutes = require("./routes/transaction.routes")

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors());


// Using the required routes.
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transaction", transactionRoutes);

module.exports = app;