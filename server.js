const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware -------------------------------------------------------------
app.use(express.json());
app.use(
  cors({
    origin: "*", // for local dev; tighten for production
  })
);

// --- MongoDB connection -----------------------------------------------------
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.warn("MONGO_URI is not set. Please create a .env file with MONGO_URI.");
}

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

// --- Mongoose models --------------------------------------------------------

const courseSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  credits: { type: Number, required: true },
});

const studentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    studentId: { type: String, required: true },
    passwordHash: { type: String, required: true },
    courses: [courseSchema],
  },
  { timestamps: true }
);

const Student = mongoose.model("Student", studentSchema);

// --- Sample courses (served by backend) -------------------------------------
const SAMPLE_COURSES = [
  { code: "CS101", name: "Introduction to Programming", credits: 3 },
  { code: "MATH201", name: "Calculus II", credits: 4 },
  { code: "ENG110", name: "Academic Writing", credits: 2 },
  { code: "HIST150", name: "World History", credits: 3 },
  { code: "PHY120", name: "Physics Fundamentals", credits: 3 },
];

// --- Routes -----------------------------------------------------------------

// Registration
app.post("/api/register", async (req, res) => {
  try {
    const { fullName, email, studentId, password } = req.body;

    if (!fullName || !email || !studentId || !password) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const existing = await Student.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const student = await Student.create({
      fullName,
      email: email.toLowerCase(),
      studentId,
      passwordHash,
      courses: [],
    });

    return res.status(201).json({
      id: student._id,
      fullName: student.fullName,
      email: student.email,
      studentId: student.studentId,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const student = await Student.findOne({ email: email.toLowerCase() });
    if (!student) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, student.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.json({
      id: student._id,
      fullName: student.fullName,
      email: student.email,
      studentId: student.studentId,
      courses: student.courses,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// Get sample courses
app.get("/api/courses", (req, res) => {
  return res.json(SAMPLE_COURSES);
});

// Get student's courses
app.get("/api/students/:id/courses", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }
    return res.json(student.courses || []);
  } catch (err) {
    console.error("Get student courses error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// Update student's courses (replace list)
app.put("/api/students/:id/courses", async (req, res) => {
  try {
    const { courses } = req.body;
    if (!Array.isArray(courses)) {
      return res.status(400).json({ message: "Courses must be an array." });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    student.courses = courses;
    await student.save();

    return res.json(student.courses);
  } catch (err) {
    console.error("Update student courses error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// --- Static front-end -------------------------------------------------------
app.use(express.static(path.join(__dirname)));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- Start server -----------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


