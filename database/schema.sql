-- Existing Users Table (Mockup based on description for reference, assuming it already exists in production)
CREATE TABLE IF NOT EXISTS users (
  uid VARCHAR(50) PRIMARY KEY,
  sponser_id VARCHAR(50),
  parent_id VARCHAR(50),
  left_uid VARCHAR(50),
  center_uid VARCHAR(50),
  right_uid VARCHAR(50),
  name VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  city VARCHAR(100),
  profile_image VARCHAR(255),
  password VARCHAR(255), -- This was in user request but we use gchat_password below per instructions
  gchat_password VARCHAR(255),
  gchat_status ENUM('active', 'inactive', 'suspended', 'banned') DEFAULT 'active',
  gchat_registered_at TIMESTAMP NULL,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50),
  verify_status VARCHAR(50),
  current_level INT,
  rank VARCHAR(50),
  prime_member TINYINT(1),
  otp VARCHAR(10)
);

-- Table: gchat_sessions
CREATE TABLE IF NOT EXISTS gchat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(50) NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  device_info TEXT,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- Table: gchat_messages
CREATE TABLE IF NOT EXISTS gchat_messages (
  id            INT AUTO_INCREMENT,
  message_id    VARCHAR(36) NOT NULL,
  sender_uid    VARCHAR(50) NOT NULL,
  receiver_uid  VARCHAR(50),                    -- NULL if group message
  group_id      INT,                             -- NULL if direct message
  message_type  ENUM('text','image','video','file','voice') DEFAULT 'text',
  message_text  TEXT,                            -- text content
  file_url      VARCHAR(500),                    -- Cloudinary URL
  file_name     VARCHAR(255),
  file_size     INT,                             -- bytes
  file_type     VARCHAR(100),                    -- MIME type (image/jpeg, etc.)
  cloudinary_public_id VARCHAR(300),             -- for future deletion from Cloudinary
  is_edited     TINYINT(1) DEFAULT 0,

  is_deleted_for_everyone TINYINT(1) DEFAULT 0, -- deleted for both parties
  is_deleted_by_sender    TINYINT(1) DEFAULT 0,
  is_deleted_by_receiver  TINYINT(1) DEFAULT 0,
  is_forwarded            TINYINT(1) DEFAULT 0,

  original_text TEXT,                            -- preserved for admin review
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  edited_at     TIMESTAMP NULL,
  edit_deadline   TIMESTAMP NULL,                -- created_at + 5 min
  delete_deadline TIMESTAMP NULL,               -- created_at + 5 min
  PRIMARY KEY (message_id),
  KEY idx_sender   (sender_uid),
  KEY idx_receiver (receiver_uid),
  KEY idx_created  (created_at),
  FOREIGN KEY (sender_uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- Table: gchat_message_status
CREATE TABLE IF NOT EXISTS gchat_message_status (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  message_id   VARCHAR(36) NOT NULL UNIQUE,
  is_delivered TINYINT(1) DEFAULT 0,
  is_read      TINYINT(1) DEFAULT 0,
  delivered_at TIMESTAMP NULL,
  read_at      TIMESTAMP NULL,
  FOREIGN KEY (message_id) REFERENCES gchat_messages(message_id) ON DELETE CASCADE
);


-- Table: gchat_groups
CREATE TABLE IF NOT EXISTS gchat_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_uid VARCHAR(50) NOT NULL,
  group_type ENUM('broadcast','discussion') NOT NULL,
  name VARCHAR(255) NOT NULL,
  icon_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- Table: gchat_group_members
CREATE TABLE IF NOT EXISTS gchat_group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  uid VARCHAR(50) NOT NULL,
  can_send TINYINT(1) DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES gchat_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- Table: gchat_admin
CREATE TABLE IF NOT EXISTS gchat_admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin (change password immediately after first login):
INSERT INTO gchat_admin (username, password_hash)
VALUES ('gsaa_admin', SHA2('ChangeMe@2024!', 256))
ON DUPLICATE KEY UPDATE id=id;

-- Table: gchat_deleted_messages
CREATE TABLE IF NOT EXISTS gchat_deleted_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id VARCHAR(36) NOT NULL,
  deleted_by_uid VARCHAR(50),
  deleted_for ENUM('self','everyone') NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
