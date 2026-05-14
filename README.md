# Banking Backend API

A robust built from scratch banking backend service using Express.js and MongoDB. It focuses on secure authentication, account handling, and automated email services.

## Tech Stack
- **Node.js** & **Express.js** 
- **MongoDB** & **Mongoose**
- **JWT** (JSON Web Tokens) for authentication
- **Bcrypt.js** for secure password hashing
- **Nodemailer** sets up email services using OAuth2

## Features

### Already Implemented:
1. **User Authentication:** 
   - Secure Registrations and Logins.
   - Password hashing and JWT generation.
2. **Account Management:** 
   - Create accounts linked to Users.
   - Status tracking (`ACTIVE`, `FROZEN`, `CLOSED`).
   - Handles multi-currency setups (default `INR`).
   - Protected routes using JWT auth middleware.
3. **Automated Emails:** 
   - Welcome/registration emails.
   - Account login alerts.
4. **Database Models:**
   - Robust Mongoose schemas with compound indexing on key fields.

### Upcoming Features:
- **Transactions system:** Handle deposits, withdrawals, and account-to-account transfers.
- **Role-based Access Control (Admin capabilities):** Managing freezing/closing of accounts.
- **Advanced Validations & Error Handling:** Adding comprehensive global error handlers.
- **Account Dashboard:** Endpoints to fetch account limits and statements.

## Project Structure
```text
src/
 ├── config/       # DB Configurations
 ├── controller/   # Request handlers for auth and accounts
 ├── middleware/   # Custom middlewares (JWT Auth)
 ├── models/       # Mongoose schemas (User, Account)
 ├── routes/       # Express routes (auth.routes, account.routes)
 └── services/     # Third-party integrations (Email service)
```

## Setup & Installation

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Copy `.env.example` to `.env` and fill in your variables (Database URI, JWT secret, and Email OAuth credentials).
4. Run `npm run dev` to start the server in development mode using nodemon. Or `npm start` for production.

---
*Created by Lataksh*
