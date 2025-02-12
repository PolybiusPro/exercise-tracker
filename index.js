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
});

const User = mongoose.model("User", userSchema);

const addUser = (user, done) => {
    const newUser = new User({
        username: user,
    });
    newUser.save((err, data) => {
        if (err) return console.error(err);
        done(null, data);
    });
};

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
});

app.route("/api/users")
    .get((req, res) => {
        User.find({}, (err, data) => {
            if (err) return console.error(err);
            res.json(data);
        });
    })
    .post((req, res) => {
        addUser(req.body.username, (err, savedUser) => {
            if (err) return console.error(err);
            res.json(savedUser);
        });
    });

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on port " + listener.address().port);
});
