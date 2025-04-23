🚀 Project Title: LearnSphere – A Simplified Online Learning Platform

LearnSphere is a full-stack web application where users can register as Students or Instructors. Instructors can create and manage online courses by adding YouTube video links and rich text session explanations. Students can browse available courses, enroll, and track their progress.
This simplified version focuses on authentication, role-based access, form handling, file uploads, and rich text content management, giving trainees a complete but accessible full-stack experience.

Frontend
React.js
React Router
Context 
Redux 
Axios
Tailwind CSS
React-Toastify for notification
TipTap Editor (Rich text editor for session descriptions)
React-Player (for embedding YouTube videos)

Backend
Node.js + Express.js

Tools
Git + GitHub
Postman
VS Code

🌟 Key Features (Simplified & Clean)
1. User Authentication
Register/Login with email + password


Roles: Student and Instructor


JWT for secure route access


Passwords hashed with bcrypt


2. Course Management
👨‍🏫 Instructors can:
Create a course with:


Title


Description


Category


Sessions (each session includes):


Title


YouTube video link


Rich text Editor explanation (text editor with image support)


View, edit, and delete their own courses


👩‍🎓 Students can:
View list of all published courses
Filter by category
Enroll in a course
View enrolled courses on dashboard
Watch embedded videos and read session content
Mark sessions as “completed”


3. Student Dashboard
See all enrolled courses
View session completion status
Simple progress bar (e.g., "3 out of 5 sessions completed")






