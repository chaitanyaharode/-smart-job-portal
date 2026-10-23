// ============================================================================
// 1. INITIAL DATA & STATE (Saved in Browser LocalStorage)
// ============================================================================

// Known dictionary of technical skills for the Resume Parser to look for
const SKILL_DICTIONARY = [
  "HTML", "CSS", "JavaScript", "React", "Node.js", "Express",
  "MongoDB", "SQL", "Python", "Java", "Git", "REST API", "TypeScript", "PHP"
];

// Default candidate skills
let userSkills = JSON.parse(localStorage.getItem("userSkills")) || [
  "HTML", "CSS", "JavaScript", "React", "SQL"
];

// Default job listings
let jobs = JSON.parse(localStorage.getItem("jobs")) || [
  {
    id: 101,
    title: "Frontend React Developer",
    company: "Zoho Corporation",
    meta: "Chennai / Remote | 7.5 LPA",
    requiredSkills: ["HTML", "CSS", "JavaScript", "React", "Git"]
  },
  {
    id: 102,
    title: "Full Stack Engineer (MERN)",
    company: "Razorpay",
    meta: "Bengaluru | 11 LPA",
    requiredSkills: ["JavaScript", "React", "Node.js", "MongoDB", "REST API"]
  },
  {
    id: 103,
    title: "Junior Web & Database Analyst",
    company: "TCS Digital",
    meta: "Nagpur / Pune | 6.5 LPA",
    requiredSkills: ["HTML", "CSS", "JavaScript", "SQL", "Python"]
  },
  {
    id: 104,
    title: "Backend Node.js Developer",
    company: "Infosys",
    meta: "Hyderabad | 8 LPA",
    requiredSkills: ["JavaScript", "Node.js", "Express", "SQL", "Git"]
  }
];

// Default submitted job applications
let applications = JSON.parse(localStorage.getItem("applications")) || [
  {
    appId: 501,
    jobId: 101,
    candidateName: "Chaitanya Harode",
    jobTitle: "Frontend React Developer",
    company: "Zoho Corporation",
    matchScore: 80,
    status: "Shortlisted"
  }
];

// Helper function to save everything to LocalStorage
function saveState() {
  localStorage.setItem("userSkills", JSON.stringify(userSkills));
  localStorage.setItem("jobs", JSON.stringify(jobs));
  localStorage.setItem("applications", JSON.stringify(applications));
}

// ============================================================================
// 2. CORE AI SKILL MATCHING ALGORITHM (Most Important for Viva!)
// ============================================================================
/*
 * Formula: (Number of Matched Skills / Total Required Skills for Job) * 100
 * Uses case-insensitive comparison (.toLowerCase()) so "react" matches "React".
 */
function calculateJobMatch(requiredSkills) {
  const normalizedUserSkills = userSkills.map(s => s.toLowerCase());

  const matched = [];
  const missing = [];

  requiredSkills.forEach(reqSkill => {
    if (normalizedUserSkills.includes(reqSkill.toLowerCase())) {
      matched.push(reqSkill);
    } else {
      missing.push(reqSkill);
    }
  });

  const percentage = Math.round((matched.length / requiredSkills.length) * 100);
  return { percentage, matched, missing };
}

// ============================================================================
// 3. CANDIDATE SKILL TAG MANAGEMENT
// ============================================================================
function renderUserSkills() {
  const container = document.getElementById("user-skills-container");
  container.innerHTML = userSkills
    .map(
      skill => `
      <span class="skill-tag">
        ${skill}
        <span onclick="removeSkill('${skill}')" title="Remove skill">&times;</span>
      </span>`
    )
    .join("");

  // Also keep the Resume Builder's skill section in sync
  updateResumePreview();
}

function addSkill(newSkill) {
  const clean = newSkill.trim();
  if (!clean) return;

  // Prevent duplicate skills (case-insensitive check)
  const exists = userSkills.some(s => s.toLowerCase() === clean.toLowerCase());
  if (!exists) {
    userSkills.push(clean);
    saveState();
    renderAll();
  }
}

function addSkillFromInput() {
  const input = document.getElementById("skill-input");
  addSkill(input.value);
  input.value = "";
}

function removeSkill(skillToRemove) {
  userSkills = userSkills.filter(s => s !== skillToRemove);
  saveState();
  renderAll();
}

// ============================================================================
// 4. RESUME UPLOAD & KEYWORD PARSER
// ============================================================================
function parseResumeText() {
  const text = document.getElementById("resume-text").value.toLowerCase();
  const msgEl = document.getElementById("parser-message");

  if (!text.trim()) {
    msgEl.textContent = "Please paste resume text or load demo text first.";
    return;
  }

  let addedCount = 0;

  // Check each skill in our dictionary against the resume text
  SKILL_DICTIONARY.forEach(dictionarySkill => {
    if (text.includes(dictionarySkill.toLowerCase())) {
      const alreadyHas = userSkills.some(
        u => u.toLowerCase() === dictionarySkill.toLowerCase()
      );
      if (!alreadyHas) {
        userSkills.push(dictionarySkill);
        addedCount++;
      }
    }
  });

  saveState();
  renderAll();
  msgEl.textContent = `Parsed Resume! Extracted ${addedCount} new skill(s).`;
}

// Reads a .txt file uploaded by the user using the browser FileReader API
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    document.getElementById("resume-text").value = e.target.result;
    parseResumeText();
  };
  reader.readAsText(file);
}

function loadSampleResume() {
  document.getElementById("resume-text").value =
    "Completed BCA with strong hands-on projects in HTML, CSS, JavaScript, React, Node.js, MongoDB, SQL, and Git.";
  parseResumeText();
}

// ============================================================================
// 5. RENDER JOB RECOMMENDATIONS
// ============================================================================
function renderJobs() {
  const container = document.getElementById("jobs-container");
  const searchQuery = document.getElementById("search-input").value.toLowerCase();
  const sortMode = document.getElementById("sort-select").value;

  // 1. Attach live match scores to every job
  let enrichedJobs = jobs.map(job => {
    const matchData = calculateJobMatch(job.requiredSkills);
    return { ...job, ...matchData };
  });

  // 2. Filter by search bar
  enrichedJobs = enrichedJobs.filter(
    j =>
      j.title.toLowerCase().includes(searchQuery) ||
      j.company.toLowerCase().includes(searchQuery)
  );

  // 3. Sort by Highest Skill Match % if selected
  if (sortMode === "match") {
    enrichedJobs.sort((a, b) => b.percentage - a.percentage);
  }

  // 4. Render HTML cards
  container.innerHTML = enrichedJobs
    .map(job => {
      // Pick color based on score
      let scoreColor = "#dc2626"; // Red for under 50%
      if (job.percentage >= 75) scoreColor = "#16a34a"; // Green
      else if (job.percentage >= 50) scoreColor = "#d97706"; // Amber

      // Check if user already applied
      const alreadyApplied = applications.some(app => app.jobId === job.id);

      return `
      <div class="job-card">
        <div class="job-header">
          <h3>${job.title}</h3>
          <p class="job-meta">${job.company} &bull; ${job.meta}</p>

          <div class="tags-container">
            ${job.matched
              .map(s => `<span class="match-pill skill-matched">&#10003; ${s}</span>`)
              .join("")}
            ${job.missing
              .map(
                s =>
                  `<span class="match-pill skill-missing" onclick="addSkill('${s}')" title="Click to add this skill">+ ${s} (Missing)</span>`
              )
              .join("")}
          </div>
        </div>

        <div class="match-box">
          <span class="match-score" style="color: ${scoreColor}">${job.percentage}%</span>
          <small class="muted-text">Skill Match</small>
          <div style="margin-top: 8px;">
            ${
              alreadyApplied
                ? `<button class="btn-secondary" disabled>Applied &#10003;</button>`
                : `<button class="btn-primary" onclick="applyForJob(${job.id}, ${job.percentage})">Apply Now</button>`
            }
          </div>
        </div>
      </div>`;
    })
    .join("");
}

// ============================================================================
// 6. APPLICATION TRACKING SYSTEM (ATS) & RECRUITER PORTAL
// ============================================================================
function applyForJob(jobId, currentMatchScore) {
  const job = jobs.find(j => j.id === jobId);
  if (!job) return;

  const candidateName = document.getElementById("res-name").value || "Candidate";

  applications.unshift({
    appId: Date.now(),
    jobId: job.id,
    candidateName: candidateName,
    jobTitle: job.title,
    company: job.company,
    matchScore: currentMatchScore,
    status: "Applied"
  });

  saveState();
  renderAll();
  alert(`Successfully applied to ${job.title} at ${job.company}!`);
}

function renderApplications() {
  document.getElementById("app-count-badge").textContent = applications.length;
  const container = document.getElementById("ats-container");

  if (applications.length === 0) {
    container.innerHTML = `<p class="muted-text">You haven't applied to any jobs yet.</p>`;
    return;
  }

  container.innerHTML = applications
    .map(
      app => `
      <div class="ats-item">
        <div>
          <h3>${app.jobTitle}</h3>
          <p class="muted-text">${app.company} &bull; Applied with <strong>${app.matchScore}% Skill Match</strong></p>
        </div>
        <span class="status-badge">${app.status}</span>
      </div>`
    )
    .join("");
}

function renderRecruiterTable() {
  const minScore = Number(document.getElementById("min-score-slider").value);
  document.getElementById("min-score-label").textContent = `${minScore}%`;

  const tbody = document.getElementById("recruiter-tbody");
  const filteredApps = applications.filter(app => app.matchScore >= minScore);

  tbody.innerHTML = filteredApps
    .map(
      app => `
      <tr>
        <td><strong>${app.candidateName}</strong></td>
        <td>${app.jobTitle} <br/><small class="muted-text">${app.company}</small></td>
        <td><strong>${app.matchScore}%</strong></td>
        <td><span class="status-badge">${app.status}</span></td>
        <td>
          <select onchange="updateApplicationStatus(${app.appId}, this.value)">
            <option value="Applied" ${app.status === "Applied" ? "selected" : ""}>Applied</option>
            <option value="Shortlisted" ${app.status === "Shortlisted" ? "selected" : ""}>Shortlisted</option>
            <option value="Interview Scheduled" ${app.status === "Interview Scheduled" ? "selected" : ""}>Interview Scheduled</option>
            <option value="Hired" ${app.status === "Hired" ? "selected" : ""}>Hired</option>
            <option value="Rejected" ${app.status === "Rejected" ? "selected" : ""}>Rejected</option>
          </select>
        </td>
      </tr>`
    )
    .join("");
}

function updateApplicationStatus(appId, newStatus) {
  const target = applications.find(a => a.appId === appId);
  if (target) {
    target.status = newStatus;
    saveState();
    renderAll();
  }
}

function postNewJob(event) {
  event.preventDefault();
  const title = document.getElementById("job-title").value;
  const company = document.getElementById("job-company").value;
  const meta = document.getElementById("job-meta").value;
  const rawSkills = document.getElementById("job-skills").value;

  // Split comma-separated skills into a clean array
  const requiredSkills = rawSkills
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  jobs.unshift({
    id: Date.now(),
    title,
    company,
    meta,
    requiredSkills
  });

  saveState();
  renderAll();
  event.target.reset();
  alert("New job posted! Switch to the Job Matcher tab to see it.");
}

// ============================================================================
// 7. RESUME PREVIEW & TAB NAVIGATION
// ============================================================================
function updateResumePreview() {
  document.getElementById("prev-name").textContent = document.getElementById("res-name").value;
  document.getElementById("prev-role").textContent = document.getElementById("res-role").value;
  document.getElementById("prev-contact").textContent = document.getElementById("res-contact").value;
  document.getElementById("prev-edu").textContent = document.getElementById("res-edu").value;
  document.getElementById("prev-summary").textContent = document.getElementById("res-summary").value;
  document.getElementById("prev-projects").textContent = document.getElementById("res-projects").value;

  document.getElementById("prev-skills").innerHTML = userSkills
    .map(s => `<span class="skill-tag">${s}</span>`)
    .join("");
}

function switchTab(tabId, clickedBtn) {
  document.querySelectorAll(".tab-content").forEach(sec => sec.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  clickedBtn.classList.add("active");
}

function renderAll() {
  renderUserSkills();
  renderJobs();
  renderApplications();
  renderRecruiterTable();
}

// Initialize app on page load
renderAll();
