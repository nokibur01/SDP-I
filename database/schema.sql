-- Create Database
CREATE DATABASE IF NOT EXISTS batchhub_db;
USE batchhub_db;

-- 1. Users Table (Supports Students, CRs, and Administrators)[cite: 2, 6]
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    student_id VARCHAR(50) UNIQUE DEFAULT NULL,
    batch VARCHAR(50) DEFAULT NULL,
    department VARCHAR(100) DEFAULT NULL,
    role ENUM('student', 'cr', 'admin') DEFAULT 'student',
    profile_picture VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Courses Table[cite: 6]
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    course_title VARCHAR(150) NOT NULL,
    description TEXT,
    department VARCHAR(100) NOT NULL,
    batch VARCHAR(50) NOT NULL,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Notices Table[cite: 6, 7]
CREATE TABLE IF NOT EXISTS notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('academic', 'examination', 'event', 'general') DEFAULT 'general',
    target_audience VARCHAR(100) DEFAULT 'all',
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Course Materials Table[cite: 7]
CREATE TABLE IF NOT EXISTS materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    course_id INT,
    category VARCHAR(50) DEFAULT 'Lecture Notes',
    file_path VARCHAR(255) NOT NULL,
    uploaded_by INT,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Projects Table[cite: 7]
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    course_context VARCHAR(100),
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Project Members / Groups Table[cite: 7]
CREATE TABLE IF NOT EXISTS project_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    user_id INT,
    role_in_project VARCHAR(50) DEFAULT 'Member',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- update in the user
ALTER TABLE users 
ADD COLUMN skills TEXT DEFAULT NULL,
ADD COLUMN gender VARCHAR(20) DEFAULT NULL;
MODIFY COLUMN profile_picture LONGTEXT DEFAULT NULL;

-- 1. Make student_id and batch mandatory in users table
ALTER TABLE users 
MODIFY COLUMN student_id VARCHAR(50) NOT NULL,
MODIFY COLUMN batch VARCHAR(50) NOT NULL;

-- 2. Update materials table to support CR approval status
ALTER TABLE materials 
ADD COLUMN status ENUM('pending', 'approved') DEFAULT 'pending';

-- 3. Courses Table (Semester courses)[cite: 6]
CREATE TABLE IF NOT EXISTS semester_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL,
    course_title VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    batch VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Routine Table (Class schedules with time, day, room, course)
CREATE TABLE IF NOT EXISTS routines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch VARCHAR(50) NOT NULL,
    day_of_week VARCHAR(20) NOT NULL, -- e.g., 'Monday', 'Tuesday'
    time_slot VARCHAR(50) NOT NULL, -- e.g., '9:00 AM - 10:00 AM'
    course_name VARCHAR(150) NOT NULL,
    room_no VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    event_date DATETIME NOT NULL,
    location VARCHAR(150) NOT NULL,
    batch VARCHAR(50) NOT NULL, -- e.g., '2024' or 'All'
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE events 
ADD COLUMN status ENUM('pending', 'approved') DEFAULT 'approved';

-- Optional: Set existing events to 'approved'
UPDATE events SET status = 'approved' WHERE status IS NULL;

-- Remove batch column and add department column
ALTER TABLE events DROP COLUMN IF EXISTS batch;
ALTER TABLE events ADD COLUMN department VARCHAR(100) DEFAULT 'CSE';

-- Ensure all existing events are approved
UPDATE events SET status = 'approved';

ALTER TABLE events 
MODIFY COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(50) DEFAULT 'General',
    title VARCHAR(150) NOT NULL,
    file_url TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'Lecture Notes', -- e.g., 'Lecture Notes', 'Assignment', 'Book', 'Question Bank'
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    tech_stack VARCHAR(255) NOT NULL, -- e.g., 'Node.js, MySQL, JavaScript'
    repo_url TEXT NOT NULL,           -- e.g., GitHub or live demo link
    team_members VARCHAR(255) NOT NULL, -- e.g., 'Mahathir, Nahian'
    department VARCHAR(100) DEFAULT 'CSE',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS project_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    course_code VARCHAR(50) DEFAULT 'General',
    due_date DATETIME NOT NULL,
    priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
    department VARCHAR(100) DEFAULT 'CSE',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

