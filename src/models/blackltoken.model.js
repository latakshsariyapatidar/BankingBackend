const mongoose = require("mongoose");


const blacklTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "Token is required to blacklist a token"],
        index: true,
        unique: true
    }
}, {
    timestamps: true
});


blacklTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 3 });

const blacklTokenModel = mongoose.model("blacklistedToken", blacklTokenSchema);

module.exports = blacklTokenModel;