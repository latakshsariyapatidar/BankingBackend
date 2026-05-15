const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const userModel = require("../models/user.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");

/**
 * - Create a new Transaction
 */
async function createTransaction(req, res) {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

  if (!fromAccount || !toAccount || amount === undefined || !idempotencyKey) {
    return res.status(400).json({
      message:
        "From account, To Account, amount and idempotencyKey is required to initiate a transaction",
    });
  }

  if (amount <= 0 || !Number.isFinite(Number(amount))) {
    return res.status(400).json({
      message: "Amount must be a positive number",
    });
  }

  if (fromAccount === toAccount) {
    return res.status(400).json({
      message: "Sender and receiver account cannot be the same",
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
      const ageInMinutes = ( Date.now() - duplicateTransaction.createdAt.getTime() ) / 1000 / 60;
        
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
      return res.status(400).json({
        message:
          "A previous transaction with this key failed. Please retry with a new idempotency key.",
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
    user: req.user._id,
  });

  const receiverAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!senderAccount || !receiverAccount) {
    return res.status(400).json({
      message:
        "Both sender and receiver account must exist and sender account must be your account",
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

  let transaction;
  try {
    transaction = await transactionModel.create({
      fromAccount: fromAccount,
      toAccount: toAccount,
      amount: amount,
      idempotencyKey: idempotencyKey,
      status: "PENDING",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({
        message: "Transaction is still processing",
      });
    }

    return res.status(500).json({ message: "Failed to initiate transaction" });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const balance = await senderAccount.getBalance(session);
    if (balance < amount) {
      await session.abortTransaction();
      await transactionModel.findByIdAndUpdate(transaction._id, {
        status: "FAILED",
      });
      return res.status(400).json({
        message: `Insufficient balance. Current balance is ${balance}`,
      });
    }

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

    await transactionModel.findOneAndUpdate(
      { _id: transaction._id },
      { status: "COMPLETED" },
      { session },
    );

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

    if (transaction?._id) {
      await transactionModel.findByIdAndUpdate(transaction._id, {
        status: "FAILED",
      });
    }

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

  if (!toAccount || amount === undefined || !idempotencyKey) {
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

  if (toUserAccount.user.toString() === req.user._id.toString()) {
    return res.status(400).json({
      message: "Cannot fund the system account itself",
    });
  }

  const duplicateTransaction = await transactionModel.findOne({
    idempotencyKey: idempotencyKey,
  });

  if (duplicateTransaction) {
    if (duplicateTransaction.status === "COMPLETED") {
      return res.status(200).json({
        message: "Already processed",
        transaction: duplicateTransaction,
      });
    }
    if (duplicateTransaction.status === "PENDING") {
      return res
        .status(200)
        .json({ message: "Transaction is still processing" });
    }
    if (duplicateTransaction.status === "FAILED") {
      return res
        .status(400)
        .json({ message: "Funding failed. Retry with a new idempotency key." });
    }
  }

  let transaction;
  try {
    transaction = await transactionModel.create({
      fromAccount: fromUserAccount._id,
      toAccount,
      amount,
      idempotencyKey,
      status: "PENDING",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(200)
        .json({ message: "Transaction is still processing" });
    }
    return res.status(500).json({ message: "Failed to initiate transaction" });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
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

    await transactionModel.findOneAndUpdate(
      { _id: transaction._id },
      { status: "COMPLETED" },
      { session },
    );
    await session.commitTransaction();

    return res.status(201).json({
      message: `Initial funds of amount ${amount} were successfully credited`,
      transaction: transaction,
    });
  } catch (err) {
    await session.abortTransaction();
    if (transaction?._id) {
      await transactionModel.findByIdAndUpdate(transaction._id, {
        status: "FAILED",
      });
    }
    return res.status(400).json({
      message: `Transaction Failed: ${err.message}`,
    });
  } finally {
    await session.endSession();
  }
}

async function getBalance(req, res) {
  const { accountId } = req.params;

  const userAccount = await accountModel.findOne({
    _id: accountId,
    user: req.user._id,
  });

  if (!userAccount) {
    return res.status(400).json({
      message: "You can check balance of your account only.",
    });
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

  try {
    session.startTransaction();

    const balance = await userAccount.getBalance(session);

    await session.commitTransaction();

    return res.status(200).json({
      message: `Current balance is ${balance}`,
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).json({
      message: `Failed to fetch the balance: ${err.message}`,
    });
  } finally {
    await session.endSession();
  }
}

module.exports = {
  createTransaction,
  createInitialFundingTransaction,
  getBalance,
};
