//=========================== imports ===============================//

const userModel = require("../models/userModel");

const jwt = require("jsonwebtoken");

const validators = require("../validators/validator");

//================ POST /register route handler ===============================//

const createUser = async function (req, res) {
  try {
    if (!validators.isValidRequestBody(req.body))
      return res
        .status(400)
        .send({
          status: false,
          message:
            "Invalid request parameter. Please provide user details in request body.",
        });

    let { title, name, phone, email, password, address } = req.body;

    if (!validators.isValidField(title))
      return res
        .status(400)
        .send({ status: false, message: "Title is required." });

    if (!validators.isValidTitle(title))
      return res
        .status(400)
        .send({
          status: false,
          message:
            "Invalid title. Title can only be either 'Mr', 'Mrs', or 'Miss'.",
        });

    if (!validators.isValidField(name)  )
      return res
        .status(400)
        .send({ status: false, message: "User Name is required." });
    
    if(!name.match(/^[A-Za-z ]+$/)){
      return res.status(400).send({
        status :false,
        message : "User Name should contain only alphabets"
      })
    }

    if(typeof(phone) == 'number'){
     phone = phone.toString()
    }

    if (!validators.isValidField(phone)){
      return res
        .status(400)
        .send({ status: false, message: "Phone Number is required." });
      }
    
  

    if (!validators.isValidMobileNo(phone))
      return res
        .status(400)
        .send({
          status: false,
          message:
            "Invalid phone number. Please enter a valid Indian phone number.",
        });

    phone = phone.slice(-10);

    let mobileAlreadyExists = await userModel.findOne({ phone });

    if (mobileAlreadyExists)
      return res
        .status(400)
        .send({
          status: false,
          message: "Phone number has already been used.",
        });

    if (!validators.isValidField(email))
      return res
        .status(400)
        .send({ status: false, message: "Email is required." });

    if (!validators.isValidEmail(email))
      return res
        .status(400)
        .send({ status: false, message: "Email is invalid." });

    let emailAlreadyExists = await userModel.findOne({ email });

    if (emailAlreadyExists)
      return res
        .status(400)
        .send({ status: false, message: "Email has already been registered." });

    if (!validators.isValidField(password))
      return res
        .status(400)
        .send({ status: false, message: "Password is required." });

    if (!validators.isValidPassword(password))
      return res
        .status(400)
        .send({
          status: false,
          message:
            "Password should consist a minimum of 8 characters and a maximum of 15 characters.",
        });

    if (address != undefined) {
      let { pincode, city } = address;
      if (validators.isValidField(pincode)) {
        if (!/^[^0][0-9]{2}[0-9]{3}$/.test(pincode)) {
          return res
            .status(400)
            .send({
              status: false,
              message: "Pincode should be a valid pincode number.",
            });
        }
      }
      if (validators.isValidField(city)){
        if(!city.match(/^[A-Za-z]+$/)){
          return res.status(400).send({
            status : false,
            message :"City name should have alphabets only"
          })
        }
      }
    }
    let userDetails = { title, name, phone, email, password, address };

    let newUser = await userModel.create(userDetails);

    return res
      .status(201)
      .send({
        status: true,
        message: "Success",
        data: newUser,
      });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//================ POST /login route handler ===============================//

const loginUser = async function (req, res) {
  try {
    let requestBody = req.body;

    // request body validation

    if (!validators.isValidRequestBody(requestBody))
      return res
        .status(400)
        .send({
          status: false,
          message: "Invalid request parameters. Please provide login details",
        });

    if (requestBody.email && requestBody.password) {
      // email id or password is velid or not check validation

      let user = await userModel.findOne({ email: requestBody.email, password: requestBody.password});

      if (!user)
        return res
          .status(401)
          .send({ status: false, msg: "Invalid user email and Password Combination" });



      // jwt token create and send back the user
      let time =  Math.floor(Date.now() / 1000)
      let payload = { _id: user._id,
      iat : time,
      exp : time + 3600
      };

      let token = jwt.sign(payload, "projectThird");

      res.header("x-api-key", token);

      res
        .status(201)
        .send({
          status: true,
          message: "Success",
          data: { token },
        });
    } else
      return res
        .status(400)
        .send({ status: false, message: "Must contain email and password." });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//======================= exports ===============================

module.exports = { createUser, loginUser };
