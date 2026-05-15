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
 * POST /api/transaction/system/initial-funds
 * - Create initial funds transactions from system account
 */

router.post("/system/initial-funds", authMiddleware.systemAuthMiddleware, transactionController.createInitialFundingTransaction);

/**
 * GET /api/transaction/getBalance
 */

router.get("/getBalance", authMiddleware.authMiddleware, transactionController.getBalance);

module.exports = router;