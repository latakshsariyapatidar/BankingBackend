const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const transactionController = require("../controller/transaction.controller");


const router = express.Router();

/**
 * - POST /api/transactions/
 * - Create a new transaction
*/

router.post("/", authMiddleware.authMiddleware,transactionController.createTransaction);

/**
 * POST /api/transactions/system/initial-funds
 * - Create initial funds transactions from system account
 */

router.post("/system/initial-funds", authMiddleware.systemAuthMiddleware, transactionController.createInitialFundingTransaction);

module.exports = router;