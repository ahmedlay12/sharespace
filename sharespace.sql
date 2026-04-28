-- ShareSpace Database - Sprint 4
-- Team: Ahmed Layan, Yaasin Siyaad, Jed Lassman

DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  uni VARCHAR(255),
  location VARCHAR(255),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE listings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  item_condition VARCHAR(50),
  location VARCHAR(100),
  availability ENUM('available', 'reserved', 'collected') DEFAULT 'available',
  owner INT NOT NULL,
  category INT NOT NULL,
  posted VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner) REFERENCES users(id),
  FOREIGN KEY (category) REFERENCES categories(id)
);

CREATE TABLE requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,
  requester_user_id INT NOT NULL,
  message TEXT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id),
  FOREIGN KEY (requester_user_id) REFERENCES users(id)
);

CREATE TABLE ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reviewer_id INT NOT NULL,
  reviewed_id INT NOT NULL,
  score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_id) REFERENCES users(id)
);

INSERT INTO users (name, email, password, uni, location, bio) VALUES
('Ahmed Layan', 'ahmed@sharespace.com', 'password123', 'University of Roehampton', 'Roehampton Campus', 'Scrum Master and backend developer for ShareSpace.'),
('Yaasin Siyaad', 'yaasin@sharespace.com', 'password123', 'University of Roehampton', 'Barnes Area', 'Student interested in affordable study resources and electronics.'),
('Jed Lassman', 'jed@sharespace.com', 'password123', 'University of Roehampton', 'Putney', 'Frontend developer and documentation lead.');

INSERT INTO categories (name, description) VALUES
('Books & Study Supplies', 'Textbooks, notebooks, revision guides and academic materials.'),
('Electronics', 'Study lamps, chargers, extension leads and electrical items.'),
('Kitchen Essentials', 'Useful kitchen items such as kettles and rice cookers.'),
('Furniture & Storage', 'Desks, chairs, shelves and storage boxes.'),
('Clothes & Accessories', 'Clothing, bags and wearable items.');

INSERT INTO listings (title, description, item_condition, location, availability, owner, category, posted) VALUES
('Desk Lamp', 'A functional desk lamp suitable for late-night study sessions.', 'Good', 'Roehampton Library pickup', 'available', 1, 2, '2 days ago'),
('Calculus Textbook', 'First-year university maths textbook with some highlighted pages.', 'Used', 'Campus exchange point', 'available', 2, 1, '1 day ago'),
('Kettle', 'Working kettle ideal for student accommodation.', 'Very Good', 'Roehampton accommodation block', 'available', 3, 3, '3 days ago'),
('Notebook Set', 'Pack of unused notebooks suitable for lectures and revision.', 'New', 'Barnes collection', 'available', 2, 1, 'Today'),
('Extension Lead', 'Four-socket extension lead in very good working condition.', 'Very Good', 'Putney pickup', 'reserved', 1, 2, '4 days ago'),
('Rice Cooker', 'Compact rice cooker, clean and fully working.', 'Good', 'Putney exchange point', 'collected', 3, 3, '5 days ago');

INSERT INTO ratings (reviewer_id, reviewed_id, score, comment) VALUES
(2, 1, 5, 'Ahmed was great, very responsive and item as described.'),
(3, 1, 5, 'Smooth handover, would swap again!'),
(1, 2, 4, 'Yaasin was helpful and reliable.'),
(1, 3, 5, 'Jed was fantastic, easy collection.');

INSERT INTO requests (listing_id, requester_user_id, message, status) VALUES
(1, 2, 'Hi, I am interested in the desk lamp. Can I collect from the library tomorrow afternoon?', 'pending'),
(3, 1, 'Would love the kettle for my flat. Available this week for collection.', 'accepted');