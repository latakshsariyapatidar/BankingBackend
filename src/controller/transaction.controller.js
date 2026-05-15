const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const userModel = require("../models/user.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");

/**
 * - Create a new Transaction
 * The 10 step transfer flow:
 * 1. Validate the request
 * 2. Validate the idempotency key
 * 3. Check account status
 * 4. Derive sender balance from ledger
 * 5. Create transaction (PENDING)
 * 6. Create DEBIT ledger entry
 * 7. Create CREDIT ledger entry
 * 8. Mark transaction as COMPLETED
 * 9. Commit MongoDB session
 * 10. Send email notification
 */
async function createTransaction(req, res) {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message:
        "From account, To Account, amount and idempotencyKey is required to initiate a transaction",
    });
  }

  const duplicateTransaction = await transactionModel.findOne({
    idempotencyKey: idempotencyKey,
  });

  if (duplicateTransaction) {
    if (duplicateTransaction.status === "COMPLETED") {
      return res.status(200).json({
        message: "Transaction already processed",
        transaction: duplicateTransaction,
      });
    }
    if (duplicateTransaction.status === "PENDING") {
      const ageInMinutes =
        (Date.now() - duplicateTransaction.createdAt) / 1000 / 60;

      if (ageInMinutes > 5) {
        // Treat as failed — mark it so it doesn't block retries
        await transactionModel.findByIdAndUpdate(duplicateTransaction._id, {
          status: "FAILED",
        });
        return res.status(500).json({
          message: "Transaction timed out, please retry",
        });
      }

      return res.status(200).json({
        message: "Transaction is still processing",
      });
    }
    if (duplicateTransaction.status === "FAILED") {
      return res.status(500).json({
        message: "Transaction processing failed",
      });
    }
    if (duplicateTransaction.status === "REVERSED") {
      return res.status(500).json({
        message: "Transaction was reversed, please retry",
      });
    }
  }

  const senderAccount = await accountModel.findOne({
    _id: fromAccount,
  });

  const receiverAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!senderAccount || !receiverAccount) {
    return res.status(400).json({
      message: "Both sender and receiver account must exist",
    });
  }

  if (senderAccount.status === "FROZEN" || senderAccount.status === "CLOSED") {
    return res.status(400).json({
      message: "The sender's account is either frozen or is closed.",
    });
  }

  if (
    receiverAccount.status === "FROZEN" ||
    receiverAccount.status === "CLOSED"
  ) {
    return res.status(400).json({
      message: "The receivers's account is either frozen or is closed.",
    });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const balance = await senderAccount.getBalance();
    if (balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Insufficient balance. Current balance is ${balance}`,
      });
    }

    const transaction = new transactionModel({
      fromAccount: fromAccount,
      toAccount: toAccount,
      amount: amount,
      idempotencyKey: idempotencyKey,
      status: "PENDING",
    });
    await transaction.save({ session });

    const debitLedger = await ledgerModel.create(
      [
        {
          account: fromAccount,
          amount: amount,
          transaction: transaction._id,
          type: "DEBITED",
        },
      ],
      { session },
    );

    const creditLedger = await ledgerModel.create(
      [
        {
          account: toAccount,
          amount: amount,
          transaction: transaction._id,
          type: "CREDITED",
        },
      ],
      { session },
    );

    transaction.status = "COMPLETED";
    await transaction.save({ session });
    await session.commitTransaction();

    await emailService.sendTransactionEmail(
      req.user.email,
      req.user.name,
      amount,
      toAccount,
    );

    return res.status(201).json({
      message: `${amount} was transfered ${senderAccount.user._id} to ${receiverAccount.user._id} successfully`,
      transaction: transaction,
    });
  } catch (err) {
    await session.abortTransaction();
    await emailService.failedTransactionEmail(
      req.user.email,
      req.user.name,
      amount,
      toAccount,
    );

    return res.status(500).json({
      message: `Transaction failed: ${err.message}`,
    });
  } finally {
    session.endSession();
  }
}

async function createInitialFundingTransaction(req, res) {
  const { toAccount, amount, idempotencyKey } = req.body;

  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "To Account, amount and idempotency key are required",
    });
  }

  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!toUserAccount) {
    return res.status(400).json({
      message: "Account not found.",
    });
  }

  const fromUserAccount = await accountModel.findOne({
    user: req.user._id,
  });

  if (!fromUserAccount) {
    return res.status(400).json({
      message: "System account not found",
    });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const transaction = new transactionModel({
      fromAccount: fromUserAccount._id,
      toAccount,
      amount,
      idempotencyKey,
      status: "PENDING",
    });

    await transaction.save({ session });

    const debitLedgerEntry = await ledgerModel.create(
      [
        {
          account: fromUserAccount._id,
          amount,
          transaction: transaction._id,
          type: "DEBITED",
        },
      ],
      { session },
    );

    const creditLedgerEntry = await ledgerModel.create(
      [
        {
          account: toAccount,
          amount,
          transaction: transaction._id,
          type: "CREDITED",
        },
      ],
      { session },
    );

    transaction.status = "COMPLETED";
    await transaction.save({ session });

    await session.commitTransaction();

    return res.status(201).json({
      message: `Initial funds of amount ${amount} were successfully credited`,
      transaction: transaction,
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).json({
      message: `Transaction Failed: ${err.message}`,
    });
  } finally {
    await session.endSession();
  }
}

async function getBalance(req, res) {
  const { account } = req.body;

  if (!account) {
    return res.status(400).json({
      message: "account is required to check the balance",
    });
  }

  const userAccount = await accountModel.findOne({
    _id: account,
  });

  const userId = req.user._id;

  if (userId !== userAccount.user){
    return res.status(400).json({
        message: "You can check balance of your account only."
    })
  }

  if (!userAccount) {
    return res.status(400).json({
      message: "Account must exist.",
    });
  }

  if (userAccount.status === "FROZEN" || userAccount.status === "CLOSED") {
    return res.status(400).json({
      message: "The account is either frozen or is closed.",
    });
  }

  const session = await mongoose.startSession();

  const balance = await userAccount.getBalance();
  return res.status(400).json({
    message: `Current balance is ${balance}`,
  });
}


module.exports = {
  createTransaction,
  createInitialFundingTransaction,
  getBalance,
};
