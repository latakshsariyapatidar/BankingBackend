const transactionModel = require('../models/transaction.model');
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const userModel = require("../models/user.model");
const emailService = require("../services/email.service");
const { default: mongoose } = require('mongoose');

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
async function createTransaction(req, res){
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    // await emailService.sendTransactionEmail(userEmail, name, amount, toAccount);
}

async function createInitialFundingTransaction(req, res){
    const {toAccount, amount, idempotencyKey} = req.body;

    if (!toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message: "To Account, amount and idempotency key are required"
        })
    }

    const toUserAccount = await accountModel.findOne({
        _id : toAccount
    })

    if (!toUserAccount){
        return res.status(400).json({
            message: "Account not found."
        })
    }

    const systemUser = await userModel.findOne({
        systemUser: true
    }).select("+systemUser");

    if (!systemUser){
        return res.status(400).json({
            message: "System user not found"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user: systemUser._id
    });

    if (!fromUserAccount){
        return res.status(400).json({
            message: "System account not found"
        })
    }

    const session = await mongoose.startSession();
    
    try{
        session.startTransaction();

    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    })

    await transaction.save({ session });


    const debitLedgerEntry = await ledgerModel.create([{
        account : fromUserAccount._id,
        amount,
        transaction: transaction._id,
        type: "DEBITED",
    }], {session})

    const creditLedgerEntry = await ledgerModel.create([{
        account : toAccount,
        amount,
        transaction: transaction._id,
        type: "CREDITED"
    }], {session})



    transaction.status = "COMPLETED";
    await transaction.save({session});

    await session.commitTransaction();

    return res.status(201).json({
        message: `Initial funds of amount ${amount} were successfully credited`,
        transaction: transaction
    })
    }
    catch(err){
        await session.abortTransaction();
        return res.status(400).json({
            message: `Transaction Failed: ${err.message}`,
        })
    }
    finally{
        await session.endSession();
    }
}




module.exports = {
    createTransaction,
    createInitialFundingTransaction
}