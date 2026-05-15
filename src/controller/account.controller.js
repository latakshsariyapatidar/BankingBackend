const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");

async function createAccountController(req, res){
    const user = req.user;

    const account = await accountModel.create({
        user: user._id
    })

    res.status(201).json({
        account
    });

    emailService.sendAccountCreationEmail(user.email, user.name);
}

module.exports = {
    createAccountController
}