# Frontend Integration Guide

This document provides detailed information on how to connect a frontend application to the Banking Backend API.

## Base URL
All API requests must be prefixed with your base server URL, for example: `http://localhost:3000`.

## Authentication Flow

The API utilizes **JWT (JSON Web Tokens)** to secure endpoints. Tokens are handled seamlessly via two methods:
1. **Cookies**: The server automatically sets a `token` cookie when a user successfully registers or logs in.
2. **Authorization Header**: You may also manually pass the token using the HTTP header: `Authorization: Bearer <token>`.

Choose the method that best fits your frontend setup (e.g., using `withCredentials: true` in Axios for cookies).

---

## Detailed API Endpoints

### 1. Authentication Endpoints (`/api/auth`)

#### Register a New User
* **Method:** `POST`
* **Route:** `/api/auth/register`
* **Description:** Creates a new user in the system, signs a JWT, sets it as a cookie, and sends a welcome email.
* **Payload Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "user": {
      "_id": "64bcdef...",
      "email": "john@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### Login User
* **Method:** `POST`
* **Route:** `/api/auth/login`
* **Description:** Authenticates the user, sets a new token cookie, and triggers a login alert email.
* **Payload Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "user": {
      "_id": "64bcdef...",
      "email": "john@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### Logout User
* **Method:** `POST`
* **Route:** `/api/auth/logout`
* **Description:** Blacklists the active JWT token, preventing further requests using it.
* **Payload Body:** None required.
* **Headers:** Standard Auth Headers/Cookies.
* **Success Response (200 OK):**
  ```json
  {
    "message": "User already logged out"
  }
  ```

---

### 2. Account Management (`/api/accounts`)

#### Create a New Account
* **Method:** `POST`
* **Route:** `/api/accounts/`
* **Description:** Creates a new banking account linked to the authenticated user.
* **Headers Required:** `Authorization: Bearer <token>` or valid cookies.
* **Payload Body (Example depending on your final schema):**
  ```json
  {
    "currency": "INR",
    "accountType": "SAVINGS"
  }
  ```
* **Success Response:** Returns newly created account details.

---

### 3. Transactions & Balances (`/api/transaction`)

#### Create a Transaction (Transfer/Deposit/Withdrawal)
* **Method:** `POST`
* **Route:** `/api/transaction/`
* **Description:** Executes a new ledger entry/transaction between accounts.
* **Headers Required:** `Authorization: Bearer <token>`
* **Payload Body:**
  ```json
  {
    "type": "TRANSFER",
    "amount": 500,
    "fromAccountId": "account_id_xyz",
    "toAccountId": "account_id_abc"
  }
  ```
* **Success Response:** Details of the completed transaction.

#### Fetch Account Balance
* **Method:** `GET`
* **Route:** `/api/transaction/getBalance/:accountId`
* **Description:** Calculates and retrieves the exact updated balance for a specific account.
* **Headers Required:** `Authorization: Bearer <token>`
* **Params:** `accountId` in the URL path.
* **Success Response:** Total fetched balance for the account.

#### Initial System Funding
* **Method:** `POST`
* **Route:** `/api/transaction/system/initial-funds`
* **Description:** This is a system-only endpoint generally used by admins to fund accounts dynamically directly from the central reserve/system account.
* **Headers Required:** System Auth Token.
* **Payload Body:** Funding amount, destination account, etc.