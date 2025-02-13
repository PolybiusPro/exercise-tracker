const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

//connect to mongodb
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

app.use(cors());
app.use(express.static("public"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isValidDate = (str) => {
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
    if (DATE_REGEX.test(str)) {
        return !isNaN(new Date(str));
    }
};

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    log: [{ type: mongoose.Schema.Types.ObjectId, ref: "Log" }],
});

const logSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date, required: true },
});

const User = mongoose.model("User", userSchema);
const Log = mongoose.model("Log", logSchema);

const addUser = (user, done) => {
    const newUser = new User({
        username: user,
    });
    newUser.save((err, data) => {
        if (err) return console.error(err);
        done(null, data);
    });
};

const addLog = (logObj, done) => {
    //find the user specified in logObj
    User.findById(logObj.user_id, (err, user) => {
        if (err) return console.error(err);

        const newLog = new Log({
            user_id: user._id,
            description: logObj.description,
            duration: logObj.duration,
            date: logObj.date,
        });

        //push to log
        user.log.push(newLog);

        //save user with log added
        user.save((err) => {
            if (err) return console.error(err);

            newLog.save((err, newLog) => {
                if (err) return console.error(err);
                done(null, newLog);
            });
        });
    });
};

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
});

app.route("/api/users")
    .get((req, res) => {
        User.find({})
            .select({ username: true, _id: true })
            .exec((err, data) => {
                if (err) return console.error(err);
                res.json(data);
            });
    })
    .post((req, res) => {
        addUser(req.body.username, (err, savedUser) => {
            if (err) return console.error(err);
            res.json({
                username: savedUser.username,
                _id: savedUser._id,
            });
        });
    });

app.post(
    "/api/users/:_id/exercises",
    (req, res, next) => {
        if (!req.body[":_id"] || !req.body.description || !req.body.duration) {
            res.status(400);
            return res.end();
        }

        //check if date input exists and validate
        if (!req.body.date) {
            req.body.date = new Date();
        } else {
            if (isValidDate(req.body.date)) {
                req.body.date = new Date(req.body.date.replace("-", "/"));
            } else {
                res.json({ error: "Invalid Date" });
            }
        }

        addLog(
            {
                user_id: req.body[":_id"],
                description: req.body.description,
                duration: req.body.duration,
                date: req.body.date,
            },
            (err, data) => {
                if (err) return console.error(err);
                req.body.log_id = data._id;
                next();
            }
        );
    },
    (req, res) => {
        Log.findById(req.body.log_id)
            .populate("user_id")
            .exec((err, log) => {
                if (err) return console.error(err);
                res.json({
                    username: log.user_id.username,
                    description: log.description,
                    duration: log.duration,
                    date: log.date.toDateString(),
                    _id: log.user_id._id,
                });
            });
    }
);

app.get("/api/users/:_id/logs", (req, res) => {

    if (!req.params._id) {
        res.status(400);
        return res.end();
    }

    const query = req.query;

    if (query.from && query.to) {
        query.from = new Date(query.from.replace("-", "/"));
        query.to = new Date(query.to.replace("-", "/"));
    }

    const matchParams = {
        date: { $gte: query.from, $lte: query.to }
    }

    const matchObj = (query.from && query.to) ? matchParams : {};

    //lean is needed because map spits out garbage otherwise
    User.findById(req.params._id).lean()
        .populate({
            path: "log",
            match: { ...matchObj },
            select: "description duration date -_id",
            options: { limit: query.limit },
        })
        .exec((err, user) => {
            if (err) return console.error(err);
            const logs = user.log.map(log => {
                return {...log, date: new Date(log.date).toDateString()}
            })
            res.json({
                username: user.username,
                count: user.log.length,
                _id: user._id,
                log: logs,
            });
        });
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on port " + listener.address().port);
});
