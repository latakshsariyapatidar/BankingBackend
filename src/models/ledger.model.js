const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "account",
    required: [true, "Ledger must be associated with an account."],
    index: true,
    immutable: true,
  },
  amount: {
    type: Number,
    required: [true, "Amount cannot be empty in a ledger"],
    immutable: true,
  },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "transaction",
    required: [true, "Ledger must be associated with a transaction."],
    immutable: true,
    index: true,
  },
  type: {
    type: String,
    enum: {
      values: ["CREDITED", "DEBITED"],
      message: "The type of transaction can be either CREDITED or DEBITED.",
    },
    required: [true, "Transaction type cannot be empty"],
    immutable: true,
    index: true,
  },
},{ timestamps: true });

function preventLedgerModification() {  
  throw new Error(
    "Ledger entries are immutable and cannot be modified or deleted."
  );
}

ledgerSchema.pre("updateOne", preventLedgerModification);
ledgerSchema.pre("updateMany", preventLedgerModification);
ledgerSchema.pre("update", preventLedgerModification);
ledgerSchema.pre("findOneAndUpdate", preventLedgerModification);
ledgerSchema.pre("findOneAndDelete", preventLedgerModification);
ledgerSchema.pre("findOneAndRemove", preventLedgerModification);
ledgerSchema.pre("deleteOne", preventLedgerModification);
ledgerSchema.pre("deleteMany", preventLedgerModification);
ledgerSchema.pre("remove", preventLedgerModification);


const ledgerModel = mongoose.model("ledger", ledgerSchema);

module.exports = ledgerModel;
