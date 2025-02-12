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

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    logs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Log" }],
});

const logSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: String, required: true },
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

const addLog = (log, done) => {
    User.findById(log.user_id, (err, user) => {
        if (err) return console.error(err);

        const newLog = new Log({
            user_id: user._id,
            description: log.description,
            duration: log.duration,
            date: log.date,
        });

        user.logs.push(newLog);

        user.save((err, updatedUser) => {
            if (err) return console.error(err);

            newLog.save((err) => {
                if (err) return console.error(err);
            });

            done(null, updatedUser);
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

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on port " + listener.address().port);
});
