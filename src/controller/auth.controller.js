const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");

/** 
 * - User register controller
 * - POST /api/auth/register
*/
async function userRegisterController(req, res){
    const{email, password, name} = req.body;

    // checking if any account with this email exists
    const isExists = await userModel.findOne({
        email: email
    })

    // if it exists then sending the error
    if (isExists){
        return res.status(422).json({
            message:"User already exists with this email.",
            status: "failed"
        })
    }

    // if doesnt then creating the userModel
    const user = await userModel.create({
        email, password, name
    })

    // Generating the token for the current user.
    const token = jwt.sign({userId:user._id}, process.env.JWT_SECRET,{expiresIn: "3d"})

    // saving the token in the form of cookies
    res.cookie("token", token);

    // seding the user data which we just created and token along with it
    res.status(201).json({
        user:{
            _id:user._id,
            email:user.email,
            name:user.name
        },
        token:token
    })

    emailService.sendRegistrationEmail(user.email, user.name);
}

/**
 * - User login controller
 * - POST /api/auth/login
*/
async function userLoginController(req, res){
    const {email, password} = req.body;

    let user = await userModel.findOne({email: email}).select("+password");
    if (!user){
        return res.status(401).json({
            messaage:"Email or Password is invalid",
            status: "failed"
        })
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword){
        return res.status(401).json({
            messaage:"Email or Password is invalid",
            status: "failed"
        })
    }

    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: "3d"});

    res.cookie("token", token);

    res.status(200).json({
        user:{
            _id:user._id,
            email:user.email,
            name:user.name
        },
        token: token
    });

    emailService.sendLoginEmail(user.email, user.name);

}

module.exports = {
    userRegisterController,
    userLoginController
}