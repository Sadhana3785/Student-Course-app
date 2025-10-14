const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// Session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/studentDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Models
const User = require("./models/User");
const Course = require("./models/Course");

// Routes
app.get("/", (req, res) => res.render("login", { error: "" }));
app.get("/register", (req, res) => res.render("register", { error: "" }));
// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/");
  }
};

app.get("/courses", requireAuth, async (req, res) => {
  const courses = await Course.find();
  res.render("courses", { 
    courses, 
    userName: req.session.username,
    error: ""
  });
});

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render("register", { error: "Username already exists" });
    }
    
    await User.create({ username, password });
    res.redirect("/");
  } catch (error) {
    res.render("register", { error: "Registration failed. Please try again." });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    req.session.userId = user._id;
    req.session.username = username;
    res.redirect("/courses");
  } else {
    res.render("login", { error: "Invalid credentials" });
  }
});

// Add course route
app.post("/courses", requireAuth, async (req, res) => {
  try {
    const { title, description, instructor, level = "beginner", price = 0 } = req.body;
    await Course.create({ title, description, instructor, level, price });
    res.redirect("/courses");
  } catch (error) {
    const courses = await Course.find();
    res.render("courses", { 
      courses, 
      userName: req.session.username,
      error: "Failed to add course. Please try again."
    });
  }
});

// Logout route
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
