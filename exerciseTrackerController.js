'use strict';

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

mongoose.connect(process.env.MONGO_URI);

const schema = new Schema({
    username: { type: String, required: true },
    exerciseLog: [{ description: { type: String, required: true },
                    duration: { type: Number, required: true },
                    date: { type: Date, default: Date.now } 
                  }],
});

const User = mongoose.model('User', schema);

function createUser(username, done) {
  const newUser = new User({ username: username });
  newUser.save(function(err, data) {
    let res = done(null, data);
    if(err) {
      res = done(err);
    };
    return res;
  }); 
}

function getUsers(callback) {
  return User
          .find()
          .select('username _id')
          .exec(callback);
}

function getUser(userId, callback) {
  return User
          .findById(userId)
          .exec(callback);
}

function addExerciseToUser(userId, exercise, done) {
  User.findByIdAndUpdate(userId, { $push: { exerciseLog: exercise } }, { new: true }, done);
}

function getUserWithLogBetweenDates(userId, from, to, callback) {
  User.aggregate([
    { $match: {_id: userId}},
    { $project: {
        exerciseLog: {$filter: {
            input: '$exerciseLog',
            as: 'item',
            cond: { $and: [{$gte: ['$$item.date', from]}, {$lte: ['$$item.date', to]}] }
        }}, 
        username: 1
    }}
  ], callback);
}

function getUserWithLogLimited(userId, limit, callback) {
  User.findOne({ _id: userId }, { exerciseLog: { $slice:[0, limit] } }, callback);
}

function noOptionalArgs(query) {
  return !(query.from || query.to || query.limit);
}

function optionFromTo(query) {
  return !query.limit && query.from && query.to;
}

function optionLimit(query) {
  return !(query.from || query.to) && query.limit;
}

function optionsFromToAndLimit(query) {
  return query.limit && query.from && query.to; 
}

const noOptions = "";
const fromTo = "fromTo";
const limit = "limit";
const fromToAndLimit = "fromToAndLimit";

function optionsChosen(query) {
  let res = noOptions;
  if (optionFromTo(query)) {
    res = fromTo;      
  } else if (optionLimit(query)) {
      res = limit;
    } else if (optionsFromToAndLimit(query)) {
        res = fromToAndLimit;         
      }
  return res;
}

function handleWholeLogRequest(res, data) {
  res.json({ username: data.username,
             _id: data._id,
             exerciseLog: data.exerciseLog,
             totalExerciseCount: data.exerciseLog.length,
            });
}

function handleRequestBetweenDates(req, res, data) {
  const from = new Date(req.query.from);
  const to = new Date(req.query.to);

  getUserWithLogBetweenDates(data._id, from, to, function(err, data) {
    if (data.length) {
      res.json(data[0]);
    } else {
      res.json({ "error": err });
    }
  });
}

function handleLimitedLogRequest(req, res, data) {
  const limit = parseInt(req.query.limit);
  
  getUserWithLogLimited(data._id, limit, function(err, data) {
    if (data) {
      res.json({ username: data.username, _id: data._id, exerciseLog: data.exerciseLog });
    } else {
      res.json({ "error": err });
    }
  });
}

function handleRequestBetweenDatesLimited(req, res, data) {
  const from = new Date(req.query.from);
  const to = new Date(req.query.to);
  const limit = parseInt(req.query.limit);

  getUserWithLogBetweenDates(data._id, from, to, function(err, data) {
    if (data) {
      const object = data[0];
      const log = object.exerciseLog.slice(0, limit);

      res.json({ username: object.username,
                 _id: object._id,
                 exerciseLog: log
               });
    } else {
      res.json({ "error": err });
    }
  });
}


exports.User = User;
exports.createUser = createUser;
exports.getUsers = getUsers;
exports.getUser = getUser;
exports.addExerciseToUser = addExerciseToUser;
exports.optionsChosen = optionsChosen;
exports.noOptions = noOptions;
exports.fromTo = fromTo;
exports.limit = limit;
exports.fromToAndLimit = fromToAndLimit;
exports.handleWholeLogRequest = handleWholeLogRequest;
exports.handleRequestBetweenDates = handleRequestBetweenDates;
exports.handleRequestBetweenDatesLimited = handleRequestBetweenDatesLimited;
exports.handleLimitedLogRequest = handleLimitedLogRequest;
