-- BatchHub University CSE Batch Demonstration Dataset
-- Purpose: Realistic sample data for university presentation screenshots
-- Database: batchhub_db

USE batchhub_db;

-- 1. Demo User Accounts (Password for all: BatchHub@123)
-- Hash generated via bcrypt (cost factor 10): $2b$10$HsQGt1tLXjtgHz0Teb7DuOaKr2e095jqAdxpEM6OFAsQdnIpLPsXi
INSERT INTO users (name, email, password, student_id, batch, department, role, skills, gender, profile_picture)
VALUES 
('Mustavi Tripto', 'tripto.demo@batchhub.test', '$2b$10$HsQGt1tLXjtgHz0Teb7DuOaKr2e095jqAdxpEM6OFAsQdnIpLPsXi', '24524203151', '3rd Year', 'CSE', 'student', 'React, TypeScript, Node.js, MySQL, Tailwind CSS, Git', 'Male', 'https://api.dicebear.com/7.x/bottts/svg?seed=Tripto'),
('Arif Hasan', 'arif.demo@batchhub.test', '$2b$10$HsQGt1tLXjtgHz0Teb7DuOaKr2e095jqAdxpEM6OFAsQdnIpLPsXi', '24524203152', '3rd Year', 'CSE', 'student', 'Python, Django, Machine Learning, Data Structures, C++', 'Male', 'https://api.dicebear.com/7.x/bottts/svg?seed=Arif'),
('Nusrat Jahan', 'nusrat.demo@batchhub.test', '$2b$10$HsQGt1tLXjtgHz0Teb7DuOaKr2e095jqAdxpEM6OFAsQdnIpLPsXi', '24524203153', '3rd Year', 'CSE', 'student', 'UI/UX Design, Figma, React, Tailwind CSS, Prototyping', 'Female', 'https://api.dicebear.com/7.x/bottts/svg?seed=Nusrat'),
('Fahim Ahmed', 'fahim.demo@batchhub.test', '$2b$10$HsQGt1tLXjtgHz0Teb7DuOaKr2e095jqAdxpEM6OFAsQdnIpLPsXi', '24524203154', '3rd Year', 'CSE', 'student', 'Computer Networks, Linux, Cyber Security, Wireshark, Docker', 'Male', 'https://api.dicebear.com/7.x/bottts/svg?seed=Fahim'),
('Sakib Rahman', 'sakib.cr@batchhub.test', '$2b$10$HsQGt1tLXjtgHz0Teb7DuOaKr2e095jqAdxpEM6OFAsQdnIpLPsXi', '24524203150', '3rd Year', 'CSE', 'cr', 'Full-Stack Development, Git, Agile Project Management, Java', 'Male', 'https://api.dicebear.com/7.x/bottts/svg?seed=Sakib'),
('Demo Admin', 'admin.demo@batchhub.test', '$2b$10$HsQGt1tLXjtgHz0Teb7DuOaKr2e095jqAdxpEM6OFAsQdnIpLPsXi', 'ADMIN-DEMO-01', '3rd Year', 'CSE', 'admin', 'System Administration, Database Optimization, Network Security', 'Other', 'https://api.dicebear.com/7.x/bottts/svg?seed=Admin')
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  role = VALUES(role),
  skills = VALUES(skills),
  batch = VALUES(batch),
  department = VALUES(department);

-- 2. Semester Courses
INSERT INTO semester_courses (course_code, course_title, department, batch)
VALUES
('CSE-3201', 'Software Engineering', 'CSE', '3rd Year'),
('CSE-3203', 'Database Management Systems', 'CSE', '3rd Year'),
('CSE-3205', 'Computer Networks', 'CSE', '3rd Year'),
('CSE-3207', 'Operating Systems', 'CSE', '3rd Year'),
('CSE-3209', 'Computer Architecture', 'CSE', '3rd Year')
ON DUPLICATE KEY UPDATE course_title = VALUES(course_title);

-- 3. Academic Routine (Distributed throughout university week)
DELETE FROM routines WHERE batch = '3rd Year';
INSERT INTO routines (batch, day_of_week, time_slot, course_name, room_no)
VALUES
('3rd Year', 'Sunday', '09:00 AM - 10:30 AM', 'Software Engineering (CSE-3201)', 'Room 402, Dept of CSE'),
('3rd Year', 'Sunday', '11:00 AM - 12:30 PM', 'Database Management Systems (CSE-3203)', 'Lab 2, CSE Building'),
('3rd Year', 'Monday', '10:00 AM - 11:30 AM', 'Operating Systems (CSE-3207)', 'Room 401, Dept of CSE'),
('3rd Year', 'Tuesday', '09:00 AM - 10:30 AM', 'Computer Networks (CSE-3205)', 'Lab 3, CSE Building'),
('3rd Year', 'Wednesday', '11:00 AM - 12:30 PM', 'Computer Architecture (CSE-3209)', 'Room 405, Dept of CSE'),
('3rd Year', 'Thursday', '02:00 PM - 03:30 PM', 'Software Engineering Lab (CSE-3202)', 'Software Lab 1');

