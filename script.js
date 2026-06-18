document.addEventListener("DOMContentLoaded", () => {
  // State
  let semesters = [];

  // DOM Elements
  const semestersContainer = document.getElementById("semesters-container");
  const addSemesterBtn = document.getElementById("add-semester-btn");
  const resetBtn = document.getElementById("reset-btn");
  const finalCgpaEl = document.getElementById("final-cgpa");
  const finalCreditsEl = document.getElementById("final-credits");

  // Templates
  const semesterTemplate = document.getElementById("semester-template");
  const subjectRowTemplate = document.getElementById("subject-row-template");

  // Grade to Points Map
  const gradeMap = {
    O: 10,
    o: 10,
    "A+": 9,
    "a+": 9,
    A: 8,
    a: 8,
    "B+": 7,
    "b+": 7,
    B: 6,
    b: 6,
    C: 5,
    c: 5,
    D: 4,
    d: 4,
    F: 0,
    f: 0,
  };

  // Helper functions
  function getPointsFromMarks(marks) {
    if (marks >= 90) return 10;
    if (marks >= 80) return 9;
    if (marks >= 70) return 8;
    if (marks >= 60) return 7;
    if (marks >= 50) return 6;
    if (marks >= 45) return 5;
    if (marks >= 40) return 4;
    return 0; // F
  }

  // Initialize with one semester
  addSemester();

  // Event Listeners
  addSemesterBtn.addEventListener("click", addSemester);
  resetBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset everything?")) {
      semestersContainer.innerHTML = "";
      semesters = [];
      addSemester();
      updateOverallResults();
    }
  });

  function addSemester() {
    const semesterId = Date.now();
    const semesterIndex = semestersContainer.children.length + 1;

    // Clone Template
    const clone = semesterTemplate.content.cloneNode(true);
    const semesterEl = clone.querySelector(".semester-card");
    semesterEl.dataset.id = semesterId;

    // Update Semester Number
    semesterEl.querySelector(".semester-number").textContent = semesterIndex;

    // Add Subject Button Handler (Single)
    const addSubjectBtn = semesterEl.querySelector(".add-subject-btn");
    const subjectsList = semesterEl.querySelector(".subjects-list");
    addSubjectBtn.addEventListener("click", () =>
      addSubject(subjectsList, semesterEl)
    );

    // Quick Add Handler
    const quickAddBtn = semesterEl.querySelector(".quick-add-btn");
    const quickAddInput = semesterEl.querySelector(".quick-add-count");

    quickAddBtn.addEventListener("click", () => {
      const count = parseInt(quickAddInput.value) || 1;
      for (let i = 0; i < count; i++) {
        addSubject(subjectsList, semesterEl);
      }
    });

    // Delete Semester Handler
    const deleteSemBtn = semesterEl.querySelector(".delete-semester");
    deleteSemBtn.addEventListener("click", () => {
      semesterEl.remove();
      renumberSemesters();
      updateOverallResults();
    });

    // Add initial subject
    addSubject(subjectsList, semesterEl);

    semestersContainer.appendChild(semesterEl);
  }

  function addSubject(listEl, semesterEl) {
    const clone = subjectRowTemplate.content.cloneNode(true);
    const row = clone.querySelector(".subject-row");

    // Auto-generate name based on count
    const currentCount = listEl.querySelectorAll(".subject-row").length + 1;

    // Inputs
    const nameInput = row.querySelector(".subject-name");
    const creditInput = row.querySelector(".credit-input");
    const marksInput = row.querySelector(".marks-input");
    const gradeSelect = row.querySelector(".grade-select");
    const typeSelector = row.querySelector(".input-type-selector");
    const deleteBtn = row.querySelector(".delete-subject");

    // Set default name
    nameInput.value = `Subject ${currentCount}`;

    // Toggle Marks/Grade
    typeSelector.addEventListener("change", (e) => {
      if (e.target.value === "grade") {
        marksInput.classList.add("hidden");
        gradeSelect.classList.remove("hidden");
        marksInput.value = ""; // clear marks
      } else {
        marksInput.classList.remove("hidden");
        gradeSelect.classList.add("hidden");
        gradeSelect.value = "10"; // reset default
      }
      calculateSemester(semesterEl);
    });

    // Live Calculations
    [creditInput, marksInput, gradeSelect].forEach((input) => {
      input.addEventListener("input", () => calculateSemester(semesterEl));
    });

    // Delete Subject
    deleteBtn.addEventListener("click", () => {
      // Allow deleting even the last one if they want to clear it?
      // We'll allow deleting all subjects to let users clear the slate if they used quick add wrongly
      if (listEl.querySelectorAll(".subject-row").length > 0) {
        row.remove();
        calculateSemester(semesterEl);
      }
    });

    listEl.appendChild(row);

    // Auto-focus credit input (better UX)
    // Check if this was a user interaction vs initial load?
    // Simple heuristic: if element is in document, focus it.
    creditInput.focus();
  }

  function renumberSemesters() {
    const semesterCards = document.querySelectorAll(".semester-card");
    semesterCards.forEach((card, index) => {
      card.querySelector(".semester-number").textContent = index + 1;
    });
  }

  function calculateSemester(semesterEl) {
    const subjects = semesterEl.querySelectorAll(".subject-row");
    let totalCredits = 0;
    let totalPoints = 0;

    // Projected totals (for 4-credit subject variation)
    let projectedTotalPoints = 0;

    subjects.forEach((row) => {
      const credits = parseFloat(row.querySelector(".credit-input").value) || 0;
      const type = row.querySelector(".input-type-selector").value;
      let points = 0;
      let projectedPoints = 0;
      let isFail = false;

      if (type === "marks") {
        const marksVal = row.querySelector(".marks-input").value;
        if (marksVal !== "") {
          const marks = parseFloat(marksVal);
          points = getPointsFromMarks(marks); // Standard

          // Fail Check
          if (marks < 40) isFail = true;

          // Projected Logic for 4-Credit Subjects (Boosted / Relative Grading)
          if (credits === 4) {
            if (marks < 40) projectedPoints = 0;
            else if (marks >= 87) projectedPoints = 10; // Boosted O
            else if (marks >= 77) projectedPoints = 9; // Boosted A+
            else if (marks >= 67) projectedPoints = 8; // Boosted A
            else if (marks >= 57) projectedPoints = 7; // Boosted B+
            else if (marks >= 47) projectedPoints = 6; // Boosted B
            else if (marks >= 40) projectedPoints = 5; // Boosted C (Optimistic)
          } else {
            projectedPoints = points;
          }
        }
      } else {
        points = parseFloat(row.querySelector(".grade-select").value);
        projectedPoints = points;
        if (points === 0) isFail = true;
      }

      // Update UI for Fail
      const failIndicator = row.querySelector(".fail-indicator");
      if (isFail) {
        row.classList.add("is-fail");
        if (failIndicator) failIndicator.textContent = "FAIL (F)";
      } else {
        row.classList.remove("is-fail");
        if (failIndicator) failIndicator.textContent = "";
      }

      // Calculation
      if (credits > 0) {
        totalCredits += credits;
        totalPoints += points * credits;
        projectedTotalPoints += projectedPoints * credits;
      }
    });

    const sgpa =
      totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
    semesterEl.querySelector(".sgpa-value").textContent = sgpa;
    semesterEl.dataset.credits = totalCredits;
    semesterEl.dataset.points = totalPoints;
    semesterEl.dataset.projectedPoints = projectedTotalPoints;

    updateOverallResults();
  }

  function updateOverallResults() {
    let grandTotalCredits = 0;
    let grandTotalPoints = 0;
    let grandProjectedPoints = 0;

    document.querySelectorAll(".semester-card").forEach((card) => {
      grandTotalCredits += parseFloat(card.dataset.credits || 0);
      grandTotalPoints += parseFloat(card.dataset.points || 0);
      grandProjectedPoints += parseFloat(card.dataset.projectedPoints || 0);
    });

    const cgpa =
      grandTotalCredits > 0
        ? (grandTotalPoints / grandTotalCredits).toFixed(2)
        : "0.00";
    const projectedCgpa =
      grandTotalCredits > 0
        ? (grandProjectedPoints / grandTotalCredits).toFixed(2)
        : "0.00";

    finalCgpaEl.textContent = cgpa;
    finalCreditsEl.textContent = grandTotalCredits;

    // Show projected if different
    const projectedEl = document.getElementById("projected-cgpa-row");
    const projectedValueEl = document.getElementById("projected-cgpa");

    if (
      grandTotalCredits > 0 &&
      Math.abs(parseFloat(cgpa) - parseFloat(projectedCgpa)) > 0.009
    ) {
      projectedEl.classList.remove("hidden");
      projectedValueEl.textContent = projectedCgpa;
    } else {
      projectedEl.classList.add("hidden");
    }

    // Animation attempt for the number
    animateValue(
      finalCgpaEl,
      parseFloat(finalCgpaEl.textContent),
      parseFloat(cgpa),
      500
    );
  }

  // Simple number animation
  function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      obj.innerHTML = (progress * (end - start) + start).toFixed(2);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        // Animation Complete
        if (end > 8.5) {
          triggerConfetti();
        }
      }
    };
    window.requestAnimationFrame(step);
  }

  function triggerConfetti() {
    // Trigger generic confetti
    if (typeof confetti !== "undefined") {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }
});
