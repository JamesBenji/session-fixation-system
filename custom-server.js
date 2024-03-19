const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require('fs');
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const uuid = require("uuid");
const UserModel = require("./models/User");
const userSessions = require("./models/userSessions");
const PORT = process.env.PORT || 7000;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const mongoURI = "mongodb://localhost:27017/group10";
mongoose.connect(mongoURI, {}).then((res) => console.log("MongoDB connected"));

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.get("/login", (req, res) => {
  console.log(`Received URL: ${req.url}`);
  const loginPath = path.join(__dirname, "public", "login.html");
  res.sendFile(loginPath, (err) => {
    if (err) {
      console.error(err);
      res.status(404).send("File not found");
    } else {
      console.log(`Login page sent successfully`);
    }
  });
});

app.post("/auth", async (req, res) => {
  const { email, password } = req.body;
  const { sid } = req.query;

  const getUser = await UserModel.findOne({ email }).exec();

  if (getUser) {
    if (password !== getUser.password) {
      res.send("Wrong password");
    }

    const userHasSession = await userSessions.findOne({
      "user.email": getUser.email,
    });

    if (sid) {
      console.log("sid seen");
      try {
        const existingSession = await userSessions
          .findOne({ sessionID: sid })
          .exec();

        if (existingSession) {
          // If session exists, update the user object with new values
          // existingSession.user.username = getUser.username;
          // existingSession.user.email = getUser.email;
          // await existingSession.save();
          await userSessions.updateOne(
            { sessionID: sid },
            { $set: { "user.username": getUser.username, "user.email": getUser.email } }
          ).exec();
          res.redirect(`/dashboard?sid=${sid}`);
        } else {
          res.send("Session not found");
        }
      } catch (error) {
        console.log(error);
        res.status(500).send("Internal server error");
      }
    } else if (userHasSession) {
      res.redirect(`/dashboard?sid=${userHasSession.sessionID}`);
    } else {
      const gensessionID = uuid.v4();
      // console.log(gensessionID)
      const genexpiresAt = new Date(new Date().getTime() + 10 * 60 * 1000);
      const session = new userSessions({
        sessionID: gensessionID,
        expiresAt: genexpiresAt,
        user: {
          username: getUser.username,
          email: getUser.email,
        },
      });
      await session.save();

      res.redirect(`/dashboard?sid=${gensessionID}`);
    }
  } else {
    res.send("No user found");
  }
});

app.get("/dashboard", async (req, res) => {
  const { sid } = req.query;
  let userData = {};

  const session = await userSessions.findOne({ sessionID: sid }).exec();
  if (session) {
    userData = session.user;
    userData.sessionID = session.sessionID;
    res.cookie('session_ID', sid);
    res.render("dashboard", { userData });
  } else {
    res.send("Session not found");
  }
});

app.get("/register", (req, res) => {
  const registerPath = path.join(__dirname, "public", "register.html");
  res.sendFile(registerPath, (err) => {
    if (err) {
      console.error(err);
      res.status(404).send("File not found");
    } else {
      console.log("Register page sent successfully");
    }
  });
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  let user = await UserModel.findOne({ email });
  if (user) return res.redirect("/");
  //   const hashedPassword = await bcrypt.hash(password, 12);
  //   console.log(`Hashed pwd: ${hashedPassword}`);
  user = new UserModel({
    username,
    email,
    password,
  });
  await user.save();
  res.send("Success");
});

app.post("/logout", async (req, res) => {
  const { sid } = req.query;
  console.log(sid)
  console.log(`received url: ${req.url}`)
  try {
    // Delete the session with the provided session ID
    await userSessions.deleteOne({ sessionID: sid }).exec();
    res.send("Logout successful");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});


function getContentType(fileName) {
  const ext = path.extname(fileName);
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.ttf':
      return 'font/ttf';
    case '.css':
      return 'text/css';

    default:
      return 'application/octet-stream';
  }
}

app.get('/files/:folderName/:fileName', (req, res) => {
  const { folderName, fileName } = req.params;

  const filePath = path.join(__dirname, folderName, fileName);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(404).send('File not found');
    }

    res.setHeader('Content-Type', getContentType(fileName));
    res.send(data);
  });
});



app.listen(PORT, () => console.log(`Listening on ${PORT}`));