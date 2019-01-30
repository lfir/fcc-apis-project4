'use strict';

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const controller = require('./exerciseTrackerController.js');
const cors = require('cors');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// URL to check mongodb connection status
app.get('/is-mongoose-ok', function(req, res) {
  if (mongoose) {
    res.json({isMongooseOk: !!mongoose.connection.readyState});
  } else {
    res.json({isMongooseOk: false});
  }
});

// API Endpoints
// User story 1
app.post("/api/exercise/new-user", function(req, res) {
  const uname = req.body.username;

  controller.createUser(uname, function(err, data) {
    res.json({ username: data.username, _id: data._id });
  });
});

// User story 2
app.get('/api/exercise/users', function(req, res) {
  controller.getUsers(function(err, data) {
    if (data) {
      res.json(data);
    } else {
      res.json({ "error": err });
    }
  });
});

// User story 3
app.post("/api/exercise/add", function(req, res) {
  const userId = req.body.userId;
  
  let exercise = { description: req.body.description, duration: req.body.duration };
  if (req.body.date) {
    exercise.date = req.body.date; 
  }

  controller.addExerciseToUser(userId, exercise, function(err, data) {
    if (data) {
      res.json({ username: data.username, _id: data._id, exerciseLog: data.exerciseLog });
    } else {
      res.json({ "error": err });
    }
  });

});

// User stories 4 & 5
app.get('/api/exercise/log', function(req, res) {
  controller.getUser(req.query.userId, function(err, data) {
    if (!data) {
      res.json({ "error": err });
    }

    switch(controller.optionsChosen(req.query)) {
      case controller.noOptions:
        controller.handleWholeLogRequest(res, data);
        break;
      case controller.fromTo:
        controller.handleRequestBetweenDates(req, res, data);
        break;
      case controller.limit:
        controller.handleLimitedLogRequest(req, res, data);
        break;
      case controller.fromToAndLimit:
        controller.handleRequestBetweenDatesLimited(req, res, data);
        break;
    }
  });
});
//

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
