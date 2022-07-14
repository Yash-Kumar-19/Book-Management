//=================================== imports ==========================================//

const validators = require("../validators/validator");

const bookModel = require("../models/bookModel");

const userModel = require("../models/userModel");

const reviewModel = require("../models/reviewModel");

const moment = require("moment");

//============================ POST /books route handler =========================================//

const createBook = async function (req, res) {
  try {
    const data = req.body;

    if (!validators.isValidRequestBody(data))
      return res.status(400).send({
        status: false,
        message: "Invalid request body. Please provide book details.",
      });

    let {
      title,
      excerpt,
      userId,
      ISBN,
      category,
      subcategory,
      releasedAt,
      reviews,
    } = data;

    if (!validators.isValidField(title))
      return res
        .status(400)
        .send({ status: false, message: "title is required." });

    const titleAlreadyInUse = await bookModel.findOne({ title });

    if (titleAlreadyInUse)
      return res.status(400).send({
        status: false,
        message: `title : ${title}, is already in use`,
      });

    if (!validators.isValidField(excerpt))
      return res
        .status(400)
        .send({ status: false, message: "excerpt is required." });

    if (!validators.isValidField(userId))
      return res
        .status(400)
        .send({ status: false, message: "userId is required." });

    if (!validators.isValidObjectId(userId))
      return res.status(400).send({
        status: false,
        message: "The given userId is not a valid ObjectId.",
      });

    const decodedToken = req.validToken;

    if (decodedToken._id != userId)
      return res.status(403).send({
        status: false,
        message: "Unauthorised access ! Owner info does not match.",
      });

    if (!validators.isValidField(ISBN))
      return res
        .status(400)
        .send({ status: false, message: "ISBN is requiured." });

    if (!validators.isValidISBN(ISBN))
      return res.status(400).send({
        status: false,
        message:'Enter a valid ISBN number of 10 or 13  digits without hyphen(-).',
      });

    let ISBNalreadyInUse = await bookModel.findOne({ ISBN });

    if (ISBNalreadyInUse)
      return res.status(400).send({
        status: false,
        message: "ISBN has already been registered to another book.",
      });

    if (!validators.isValidField(category))
      return res
        .status(400)
        .send({ status: false, message: "category is required." });

    if (!validators.isValidField(subcategory))
      return res.status(400).send("subcategory is required.");

    if (validators.isValidField(subcategory)) {
      let temp = subcategory;

      if (typeof subcategory == "object") subcategory = temp;
      else subcategory = temp.split(",").map(String);
    }

    if (!validators.isValidField(releasedAt))
      return res
        .status(400)
        .send({ status: false, message: "releasedAt is required." });

    if (!moment(releasedAt, "YYYY-MM-DD", true).isValid())
      return res.status(400).send({
        status: false,
        message: "Enter a valid date with the format (YYYY-MM-DD).",
      });

    if (validators.isValidField(reviews))
      if (reviews != "0")
        return res.status(400).send({
          status: false,
          message:
            "reviews cannot be set to a value other than 0 while creating a new book.",
        });

    let bookData = {
      title,
      excerpt,
      userId,
      ISBN,
      category,
      subcategory,
      releasedAt,
      reviews,
    };

    const newBook = await bookModel.create(bookData);

    return res.status(201).send({
      status: true,
      message: "Success",
      data: newBook,
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//================================= GET /books route handler ============================================//

const getBooks = async function (req, res) {
  try {
    let filter = { isDeleted: false };

    if (req.query.userId != undefined) {
      if (!validators.isValidObjectId(req.query.userId))
        return res.status(400).send({
          status: false,
          message: "Invalid request parameter. userId is invalid.",
        });

      let userExists = await userModel.findOne({ _id: req.query.userId });
      if (!userExists)
        return res.status(404).send({
          status: false,
          message: "UserId does not belong to an existing user.",
        });

      filter["userId"] = req.query.userId;
    }

    if (req.query.category != undefined)
      filter["category"] = req.query.category;

    if (req.query.subcategory) {
      let temp = req.query.subcategory;

      if (typeof subcategory == "object") subcategory = temp;
      else subcategory = temp.split(",").map(String);

      filter["subcategory"] = { $in: temp };
    }

    let books = await bookModel
      .find(filter, {
        _id: 1,
        title: 1,
        excerpt: 1,
        userId: 1,
        category: 1,
        reviews: 1,
        releasedAt: 1,
      })
      .sort({ title: 1 });

    if (books.length == 0)
      return res
        .status(404)
        .send({ status: false, message: "Book(s) not found." });

    return res
      .status(200)
      .send({ status: true, message: "Success", data: books });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//============================= GET /books/:bookId route handler =========================================//

const getBookById = async function (req, res) {
  try {
    let bookId = req.params.bookId;

    if (!validators.isValidObjectId(bookId))
      return res.status(400).send({
        status: false,
        message: `The given bookId:${bookId} is not a valid book id`,
      });

    const bookDetail = await bookModel.findOne({
      _id: bookId,
      isDeleted: false,},
      {ISBN : 0}
      );

    if (!bookDetail){
      return res
        .status(404)
        .send({ status: false, message: "Book not found!" });
      }

    const reviewsData = await reviewModel.find(
      { bookId: bookId, isDeleted: false },
      { _id: 1, bookId: 1, reviewedBy: 1, rating: 1, review: 1, releasedAt: 1 }
    );

    return res.status(200).send({
      status: true,
      message: "Success",
      data: { ...bookDetail.toObject(), reviewsData },
    });
  } catch (error) {
    return res.status(500).send({ status: false, error: error.message });
  }
};

//=============================== PUT /books/:bookId route handler ==========================================//

const updateBookById = async function (req, res) {
  try {
    let requestBody = req.body;

    if (!validators.isValidRequestBody(requestBody))
      return res.status(400).send({
        status: false,
        message:
          "Invalid request parameters. Please provide the book details to be updated.",
      }); //change-- erase author

    let bookId = req.params.bookId;

    if (!validators.isValidObjectId(bookId))
      return res.status(400).send({
        status: false,
        message: `Invalid request parameter. The given bookId:${bookId} is not a valid book id`,
      });

    let bookIdCheck = await bookModel.findOne({
      _id: bookId,
      isDeleted: false,
    });

    if (!bookIdCheck)
      return res
        .status(404)
        .send({ status: false, message: "Book not found!" });

    if (!(req.validToken._id == bookIdCheck.userId))
      return res
        .status(403)
        .send({ status: false, message: "Unauthorized access!" });

    let updateObject = {};

    if('title' in requestBody){   
      if (!validators.isValidField(requestBody.title)) {
        return res.status(400).send({
          status : false,
          message : "Not a valid title"
        })
      }
      const titleAlreadyInUse = await bookModel.findOne({
        title: requestBody.title,
        isDeleted: false,
      });

      if (titleAlreadyInUse)
        return res.status(400).send({
          status: false,
          message: `The title : '${requestBody.title}', has already been taken.`,
        });

      updateObject.title = requestBody.title;
    }

    
    if('excerpt' in requestBody){ 
      if (!validators.isValidField(requestBody.excerpt)){
        return res.status(400).send({
          status : false,
          message : "Not a valid excerpt"
        })
      }
       updateObject.excerpt = requestBody.excerpt;
    
    }   

    
    if('ISBN' in requestBody){
        if (!validators.isValidField(requestBody.ISBN)){
          return res.status(400).send({
            status : false,
            message : "ISBN missing"
          })
        }
        if (!validators.isValidISBN(requestBody.ISBN))
        return res.status(400).send({
          status: false,
          message:
            "Enter a valid ISBN number of 10 or 13  digits without hyphen(-).",
        });

      let ISBNalreadyInUse = await bookModel.findOne({
        ISBN: requestBody.ISBN,
      });

      if (ISBNalreadyInUse)
        return res.status(400).send({
          status: false,
          message: `ISBN:${requestBody.ISBN} has already been registered to another book.`,
        });

      updateObject.ISBN = requestBody.ISBN;
    }
    if('releasedAt' in requestBody){
    if (!validators.isValidField(requestBody.releasedAt)){
        return res.status(400).send({
          status : false,
          message : "Released date is missing"
        })
    }
      if (!moment(requestBody.releasedAt, "YYYY-MM-DD", true).isValid())
        return res.status(400).send({
          status: false,
          message: "Enter a valid date with the format YYYY-MM-DD.",
        });

      updateObject.releasedAt = requestBody.releasedAt;
    
  }
  

    let update = await bookModel.findOneAndUpdate(
      { _id: bookId },
      updateObject,
      { new: true }
    );

    return res.status(200).send({
      status: true,
      message: "Success",
      data: update,
    });
  } catch (error) {
    return res.status(500).send({ status: false, error: error.message });
  }
};

//=================================== DELETE /books/:bookId route handler =========================================//

const deleteBookById = async function (req, res) {
  try {
    if (req.params.bookId === undefined)
      return res.status(400).send({
        status: false,
        message: "Invalid request parameter. Please provide bookId.",
      });

    if (!validators.isValidObjectId(req.params.bookId))
      return res.status(400).send({
        status: false,
        message: `Invalid request parameter. The given bookId:${req.params.bookId} is not a valid ObjectId.`,
      });

    let book = await bookModel.findOne(
      { _id: req.params.bookId, isDeleted: false },
      { userId: 1 }
    );
    if (!book)
      return res
        .status(404)
        .send({ status: false, message: "Book doesn't exist." });

    if (req.validToken._id != book.userId)
      return res.status(403).send({
        status: false,
        message: "Unauthorised access ! Owner info does not match",
      });

    await bookModel.findOneAndUpdate(
      { _id: req.params.bookId },
      { isDeleted: true, deletedAt: Date.now() },
      {new : true, upsert : true}
    );
    return res
      .status(200)
      .send({ status: true, message: "Success"});
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//================================== exports =======================================//

module.exports = {
  createBook,
  getBooks,
  getBookById,
  updateBookById,
  deleteBookById,
};
