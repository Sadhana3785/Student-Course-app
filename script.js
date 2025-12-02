// --- Simple API client (calls backend) --------------------------------------

const API_BASE = ""; // same origin (npm http://localhost:5000)

function getCurrentStudentId() {
  return localStorage.getItem("cc_current_student_id") || null;
}

function setCurrentStudentId(id) {
  if (!id) {
    localStorage.removeItem("cc_current_student_id");
  } else {
    localStorage.setItem("cc_current_student_id", id);
  }
}

function getCurrentStudentInfo() {
  const raw = localStorage.getItem("cc_current_student_info");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCurrentStudentInfo(info) {
  if (!info) {
    localStorage.removeItem("cc_current_student_info");
  } else {
    localStorage.setItem("cc_current_student_info", JSON.stringify(info));
  }
}

async function apiRegister({ fullName, email, studentId, password }) {
  const res = await fetch(`${API_BASE}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName, email, studentId, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data.message || "Registration failed.";
    throw new Error(msg);
  }
  return res.json();
}

async function apiLogin({ email, password }) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data.message || "Login failed.";
    throw new Error(msg);
  }
  return res.json();
}

async function apiGetAllCourses() {
  const res = await fetch(`${API_BASE}/api/courses`);
  if (!res.ok) throw new Error("Failed to load courses.");
  return res.json();
}

async function apiGetStudentCourses(studentId) {
  const res = await fetch(`${API_BASE}/api/students/${studentId}/courses`);
  if (!res.ok) throw new Error("Failed to load student courses.");
  return res.json();
}

async function apiUpdateStudentCourses(studentId, courses) {
  const res = await fetch(`${API_BASE}/api/students/${studentId}/courses`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courses }),
  });
  if (!res.ok) throw new Error("Failed to update courses.");
  return res.json();
}

// --- UI helpers -------------------------------------------------------------

function showView(viewName) {
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("visible", v.id === `view-${viewName}`);
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    const isActive = btn.dataset.view === viewName;
    btn.classList.toggle("active", isActive);
  });
}

function setMessage(element, text, type) {
  element.textContent = text || "";
  element.classList.remove("success", "error");
  if (type) {
    element.classList.add(type);
  }
}

function refreshUserInfo() {
  const user = getCurrentStudentInfo();
  const welcomeText = document.getElementById("welcomeText");
  const logoutBtn = document.getElementById("logoutBtn");
  const coursesNavBtn = document.getElementById("coursesNavBtn");

  if (user) {
    welcomeText.textContent = `Hi, ${user.fullName} (${user.studentId})`;
    logoutBtn.hidden = false;
    coursesNavBtn.disabled = false;
  } else {
    welcomeText.textContent = "";
    logoutBtn.hidden = true;
    coursesNavBtn.disabled = true;
  }
}

// --- Courses rendering ------------------------------------------------------

async function renderCourses() {
  const user = getCurrentStudentInfo();
  const availableList = document.getElementById("availableCoursesList");
  const studentList = document.getElementById("studentCoursesList");
  const msg = document.getElementById("coursesMessage");

  if (!user) {
    availableList.innerHTML = "";
    studentList.innerHTML = "";
    setMessage(msg, "Please login to manage your courses.", "error");
    return;
  }

  setMessage(msg, "Loading courses...", null);

  let allCourses = [];
  let enrolled = [];
  try {
    [allCourses, enrolled] = await Promise.all([
      apiGetAllCourses(),
      apiGetStudentCourses(user.id),
    ]);
  } catch (err) {
    console.error(err);
    setMessage(msg, err.message || "Failed to load courses.", "error");
    return;
  }

  const enrolledCodes = new Set(enrolled.map((c) => c.code));

  // Available courses
  availableList.innerHTML = "";
  allCourses.forEach((course) => {
    if (enrolledCodes.has(course.code)) return;
    const li = document.createElement("li");
    li.className = "course-item";
    li.innerHTML = `
      <div class="course-meta">
        <span class="course-code">${course.code}</span>
        <span class="course-name">${course.name}</span>
        <span class="course-credits">${course.credits} credits</span>
      </div>
    `;
    const btn = document.createElement("button");
    btn.className = "pill-btn add";
    btn.textContent = "Add";
    btn.addEventListener("click", async () => {
      try {
        const newCourses = [...enrolled, course];
        enrolled = await apiUpdateStudentCourses(user.id, newCourses);
        await renderCourses();
        setMessage(msg, `Added ${course.code} to your courses.`, "success");
      } catch (err) {
        console.error(err);
        setMessage(msg, err.message || "Failed to add course.", "error");
      }
    });
    li.appendChild(btn);
    availableList.appendChild(li);
  });

  // Student's courses
  studentList.innerHTML = "";
  if (enrolled.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No courses yet. Add courses from the list on the left.";
    empty.style.color = "#9ca3af";
    empty.style.fontSize = "0.85rem";
    studentList.appendChild(empty);
  } else {
    enrolled.forEach((course) => {
      const li = document.createElement("li");
      li.className = "course-item";
      li.innerHTML = `
        <div class="course-meta">
          <span class="course-code">${course.code}</span>
          <span class="course-name">${course.name}</span>
          <span class="course-credits">${course.credits} credits</span>
        </div>
      `;
      const btn = document.createElement("button");
      btn.className = "pill-btn remove";
      btn.textContent = "Remove";
      btn.addEventListener("click", async () => {
        try {
          const newCourses = enrolled.filter((c) => c.code !== course.code);
          enrolled = await apiUpdateStudentCourses(user.id, newCourses);
          await renderCourses();
          setMessage(msg, `Removed ${course.code} from your courses.`, "success");
        } catch (err) {
          console.error(err);
          setMessage(msg, err.message || "Failed to remove course.", "error");
        }
      });
      li.appendChild(btn);
      studentList.appendChild(li);
    });
  }

  const totalCredits = enrolled.reduce((sum, c) => sum + (c.credits || 0), 0);
  setMessage(msg, `You are enrolled in ${enrolled.length} course(s), total ${totalCredits} credits.`, "success");
}

// --- Event wiring -----------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Year in footer
  const yearSpan = document.getElementById("yearSpan");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // Navigation buttons
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      if (!view) return;
      if (view === "courses" && !getCurrentStudentId()) {
        alert("Please login first to view your courses.");
        return;
      }
      showView(view);
      if (view === "courses") {
        renderCourses().catch((err) => console.error(err));
      }
    });
  });

  document.querySelectorAll('.link-btn[data-view]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      showView(view);
    });
  });

  // Registration
  const registerForm = document.getElementById("registerForm");
  const registerMessage = document.getElementById("registerMessage");

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = document.getElementById("regFullName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const studentId = document.getElementById("regStudentId").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("regConfirmPassword").value;

    if (!fullName || !email || !studentId || !password) {
      setMessage(registerMessage, "Please fill in all fields.", "error");
      return;
    }

    if (password !== confirmPassword) {
      setMessage(registerMessage, "Passwords do not match.", "error");
      return;
    }

    try {
      await apiRegister({ fullName, email, studentId, password });
      setMessage(registerMessage, "Registration successful! You can now login.", "success");
      registerForm.reset();
      showView("login");
    } catch (err) {
      console.error(err);
      setMessage(registerMessage, err.message || "Registration failed.", "error");
    }
  });

  // Login
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const user = await apiLogin({ email, password });
      setCurrentStudentId(user.id);
      setCurrentStudentInfo(user);
      refreshUserInfo();
      setMessage(loginMessage, "Login successful!", "success");
      showView("courses");
      await renderCourses();
    } catch (err) {
      console.error(err);
      setMessage(loginMessage, err.message || "Login failed.", "error");
    }
  });

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", () => {
    setCurrentStudentId(null);
    setCurrentStudentInfo(null);
    refreshUserInfo();
    showView("login");
  });

  // Initial UI state
  refreshUserInfo();
  const currentId = getCurrentStudentId();
  if (currentId) {
    showView("courses");
    renderCourses().catch((err) => console.error(err));
  } else {
    showView("register");
  }
});


