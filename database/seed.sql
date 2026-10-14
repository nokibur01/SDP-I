INSERT INTO users (name, email, password, student_id, batch, department, role, skills, profile_picture) VALUES
('Ahmad Ibrahim Nahian', 'nahian@university.edu', '$2a$10$DummyHashedPasswordForTest1', '24524203110', '3rd Year', 'CSE', 'student', 'Python, C++, Socket Programming, Git', 'https://api.dicebear.com/7.x/bottts/svg?seed=Nahian'),
('Nokibur Rahman', 'nokib@university.edu', '$2a$10$DummyHashedPasswordForTest2', '24524203161', '3rd Year', 'CSE', 'student', 'Java, React, Node.js, MySQL', 'https://api.dicebear.com/7.x/bottts/svg?seed=Nokib'),
('Tanvir Ahmed', 'tanvir@university.edu', '$2a$10$DummyHashedPasswordForTest3', '24524203185', '3rd Year', 'CSE', 'student', 'Arduino, C++, Robotics, Sensors', 'https://api.dicebear.com/7.x/bottts/svg?seed=Tanvir'),
('Sadia Islam', 'sadia@university.edu', '$2a$10$DummyHashedPasswordForTest4', '24524203200', '2nd Year', 'CSE', 'student', 'HTML, CSS, JavaScript, UI/UX', 'https://api.dicebear.com/7.x/bottts/svg?seed=Sadia'),
('Rahim Uddin', 'rahim@university.edu', '$2a$10$DummyHashedPasswordForTest5', '24524203210', '4th Year', 'EEE', 'student', 'Circuit Design, Verilog, MATLAB', 'https://api.dicebear.com/7.x/bottts/svg?seed=Rahim');
 
INSERT INTO events (title, description, event_date, location, batch, created_by) VALUES
('Algorithmic Coding Contest 2026', 'Inter-batch competitive programming contest featuring dynamic programming and graph theory problems.', '2026-10-20 15:00:00', 'Computer Lab 03', '2024', 1),
('Operating Systems Midterm Review', 'Comprehensive review session covering CPU scheduling, semaphores, and virtual memory management.', '2026-10-22 11:00:00', 'Auditorium Hall B', '2024', 1),
('AI & Agent Development Workshop', 'Hands-on workshop exploring the Google Agent Development Kit and automated workflow creation.', '2026-10-25 14:30:00', 'Seminar Room 402', 'All', 1),
('Database Project Submission Deadline', 'Final deadline for submitting the MySQL & Node.js BatchHub semester project repositories.', '2026-10-30 23:59:59', 'Online LMS Portal', '2024', 1),
('Annual Batch Sports Meet 2026', 'Cricket and football tournament for batchmates. Form your departmental teams and register with the CR.', '2026-11-05 09:00:00', 'University Central Playground', 'All', 1);