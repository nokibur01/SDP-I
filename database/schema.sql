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
    course_id INT DEFAULT NULL,
    category VARCHAR(50) DEFAULT 'Lecture Notes',
    file_path VARCHAR(255) DEFAULT NULL,
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
ADD COLUMN gender VARCHAR(20) DEFAULT NULL,
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

-- Additional tables
ALTER TABLE materials
ADD COLUMN IF NOT EXISTS course_code VARCHAR(50) DEFAULT 'General',
ADD COLUMN IF NOT EXISTS file_url LONGTEXT DEFAULT NULL;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS tech_stack VARCHAR(255) DEFAULT '',
ADD COLUMN IF NOT EXISTS repo_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS team_members VARCHAR(255) DEFAULT '',
ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'CSE';

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
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Task completions table: tracks individual student task completions without deleting the shared task
CREATE TABLE IF NOT EXISTS task_completions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_task_completion UNIQUE (user_id, task_id),
    CONSTRAINT fk_task_completions_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_completions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- Notifications Table (Phase 2)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50) DEFAULT NULL,
    related_entity_id INT DEFAULT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_read (user_id, is_read, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE notices
ADD COLUMN IF NOT EXISTS is_pinned TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority ENUM('Normal', 'Important', 'Urgent') DEFAULT 'Normal';

ALTER TABLE project_requests
ADD COLUMN IF NOT EXISTS request_type ENUM('join_request', 'invitation') DEFAULT 'join_request';

-- Performance Indexes (Migration 03)
CREATE INDEX IF NOT EXISTS idx_materials_status_created ON materials (status, created_at);
CREATE INDEX IF NOT EXISTS idx_materials_course_code ON materials (course_code);
CREATE INDEX IF NOT EXISTS idx_routines_batch ON routines (batch);
CREATE INDEX IF NOT EXISTS idx_semester_courses_batch ON semester_courses (batch);
CREATE INDEX IF NOT EXISTS idx_users_batch_dept ON users (batch, department);

-- Resource Moderation History & Unique Constraints (Migration 04)
ALTER TABLE materials MODIFY COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS reviewed_by INT NULL;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS reviewed_at DATETIME NULL;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_routines_slot ON routines (batch, day_of_week, time_slot, room_no);
CREATE UNIQUE INDEX IF NOT EXISTS uq_routines_room_time ON routines (day_of_week, time_slot, room_no);
CREATE UNIQUE INDEX IF NOT EXISTS uq_routines_batch_time ON routines (batch, day_of_week, time_slot);
CREATE UNIQUE INDEX IF NOT EXISTS uq_course_batch_dept ON semester_courses (course_code, batch, department);

CREATE TABLE IF NOT EXISTS rate_limits (
    ip_key VARCHAR(100) PRIMARY KEY,
    hit_count INT DEFAULT 1,
    reset_time BIGINT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);



-- See database/migrations/05_batch_scoping.sql (per-batch content scoping)
ALTER TABLE tasks     ADD COLUMN IF NOT EXISTS batch VARCHAR(50) NULL;
ALTER TABLE events    ADD COLUMN IF NOT EXISTS batch VARCHAR(50) NULL;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS batch VARCHAR(50) NULL;
