-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 30, 2023 at 03:20 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `delete_users_and_profiles` (`p_username` VARCHAR(255))   BEGIN
    DECLARE myuser_id INT;

    -- Get the user_id associated with the given username
    SELECT id INTO myuser_id
    FROM users
    WHERE username = p_username;

    -- Delete from profiles table
    DELETE FROM profiles
    WHERE users_id = myuser_id;

    -- Delete from users table
    DELETE FROM users
    WHERE id = myuser_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `insert_users_and_profiles` (IN `p_username` VARCHAR(255), IN `p_password` VARCHAR(255), IN `p_email` VARCHAR(255))   BEGIN
    DECLARE user_id INT;
    DECLARE password_salt VARCHAR(255);

    SET password_salt = SUBSTRING_INDEX(p_password, '$SHA$', -1);

    -- Thêm dữ liệu vào bảng users
    INSERT INTO users(username, password, email, salt)
    VALUES (p_username, p_password, p_email, password_salt)
    ON DUPLICATE KEY UPDATE username = username; -- MySQL equivalent of ON CONFLICT (username) DO NOTHING

    -- Lấy id từ bảng users
    SELECT id INTO user_id FROM users WHERE username = p_username;

    -- Thêm vào bảng profiles
    INSERT INTO profiles(users_id) VALUES (user_id);
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `authme`
--

CREATE TABLE IF NOT EXISTS `authme` (
  `id` mediumint(8) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `realname` varchar(255) NOT NULL,
  `password` varchar(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ip` varchar(40) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `lastlogin` bigint(20) DEFAULT NULL,
  `x` double NOT NULL DEFAULT 0,
  `y` double NOT NULL DEFAULT 0,
  `z` double NOT NULL DEFAULT 0,
  `world` varchar(255) NOT NULL DEFAULT 'world',
  `regdate` bigint(20) NOT NULL DEFAULT 0,
  `regip` varchar(40) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `yaw` float DEFAULT NULL,
  `pitch` float DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `isLogged` smallint(6) NOT NULL DEFAULT 0,
  `hasSession` smallint(6) NOT NULL DEFAULT 0,
  `totp` varchar(32) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `authme`
--

INSERT INTO `authme` (`id`, `username`, `realname`, `password`, `ip`, `lastlogin`, `x`, `y`, `z`, `world`, `regdate`, `regip`, `yaw`, `pitch`, `email`, `isLogged`, `hasSession`, `totp`) VALUES
(3, 'tester2', 'tester2', '$SHA$KujIxRrs6NdqY9PY$611749889240913b55983892427c3a3f6d664bb2b8906d94da623d2d342688ee', '', 0, 0, 0, 0, 'world', 0, '', 0, 0, '', 0, 0, '');

--
-- Triggers `authme`
--
DELIMITER $$
CREATE TRIGGER `authme_insert_trigger` AFTER INSERT ON `authme` FOR EACH ROW BEGIN
    -- Gọi hàm insert_users_and_profiles với các giá trị từ NEW
    CALL insert_users_and_profiles(
        NEW.username,
        NEW.password,
        NEW.email
    );
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `delete_authme_and_trigger` BEFORE DELETE ON `authme` FOR EACH ROW BEGIN
    -- Gọi hàm delete_users_and_profiles với các giá trị từ OLD
    CALL delete_users_and_profiles(
        OLD.username
    );
END
$$
DELIMITER ;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NULL,
    password TEXT NOT NULL,
    is_verified BOOLEAN NULL DEFAULT false,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(255) NULL,
    salt VARCHAR(255) NULL,
    uuid VARCHAR(255) NULL,
    UNIQUE KEY users_un (username)
);
INSERT INTO `users` (`id`, `email`, `password`, `is_verified`, `created_at`, `username`, `salt`, `uuid`) VALUES
(2, '', '$SHA$KujIxRrs6NdqY9PY$611749889240913b55983892427c3a3f6d664bb2b8906d94da623d2d342688ee', 0, '2023-12-28 12:41:42', 'tester2', 'KujIxRrs6NdqY9PY$611749889240913b55983892427c3a3f6d664bb2b8906d94da623d2d342688ee', NULL);

CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(255) NOT NULL DEFAULT 'MEMBER',
    role_alias VARCHAR(255) NULL,
    UNIQUE KEY roles_pk (role_id)
);
INSERT INTO `roles` (`role_id`, `role_name`, `role_alias`) VALUES
(1, 'MEMBER', 'Thành Viên'),
(2, 'ADMIN', 'Quản Trị Viên');


CREATE TABLE profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(255) NULL COLLATE "utf8mb4_general_ci",
    sdt VARCHAR(255) NULL,
    address VARCHAR(255) NULL COLLATE "utf8mb4_general_ci",
    country VARCHAR(255) NOT NULL DEFAULT '84',
    users_id INT NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    avatar VARCHAR(255) NULL DEFAULT '25-1702483920909-cat-oew.jpg',
    balance BIGINT NOT NULL DEFAULT 0,
    roles_id INT NOT NULL DEFAULT 1,
    FOREIGN KEY (users_id) REFERENCES users(id),
    FOREIGN KEY (roles_id) REFERENCES roles(role_id)
);
INSERT INTO `profiles` (`profile_id`, `fullname`, `sdt`, `address`, `country`, `users_id`, `created_at`, `avatar`, `balance`, `roles_id`) VALUES
(2, NULL, NULL, NULL, '84', 2, '2023-12-28 12:41:42', '25-1702483920909-cat-oew.jpg', 2, 1);

CREATE TABLE posts (
    post_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NULL,
    content TEXT NULL,
    users_id INT NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT posts_fk FOREIGN KEY (users_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE files (
    file_id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NULL,
    avatar VARCHAR(255) NULL,
    publish_date DATE NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    des TEXT NULL,
    price VARCHAR(255) NULL,
    version VARCHAR(255) NULL,
    counter INT NULL DEFAULT 0,
    link VARCHAR(255) NOT NULL,
    author INT NOT NULL,
    CONSTRAINT files_fk FOREIGN KEY (author) REFERENCES users(id)
);
INSERT INTO `files` (`file_id`, `file_name`, `avatar`, `publish_date`, `created_at`, `des`, `price`, `version`, `counter`, `link`, `author`) VALUES
(1, 'File Skyblock Vanila', 'https://i.ytimg.com/vi/Uyp_B9yQ56w/maxresdefault.jpg', '2021-01-06', '2023-12-20 02:32:54', 'File skyblock sinh tồn trẻ trâu', '1', '1.12.2', 14, 'https://uploading.vn/07e67i6fqe1a', 2),
(2, 'File Skyblock 1.12+ 2021', 'https://staticg.sportskeeda.com/editor/2022/03/dfa47-16480512985216-1920.jpg', '2021-09-05', '2023-12-20 02:22:32', 'Share quả file server chất lượng cho ae. Nhớ Like và Đăng ký kênh nhinguyenMC nha. Thanks!', '2', '1.12.2', 23, 'https://uploading.vn/o1cl29edhmg3', 2);

CREATE TABLE detail_file (
    detail_file_id INT AUTO_INCREMENT PRIMARY KEY,
    file_id INT NOT NULL,
    des1 VARCHAR(255) DEFAULT 'Mô tả 1',
    des2 VARCHAR(255) DEFAULT 'Mô tả 2',
    des3 VARCHAR(255) DEFAULT 'Mô tả 3',
    img1 VARCHAR(255) DEFAULT 'https://media.forgecdn.net/avatars/297/308/637344073217841957.png',
    img2 VARCHAR(255) DEFAULT 'https://media.forgecdn.net/avatars/297/308/637344073217841957.png',
    img3 VARCHAR(255) DEFAULT 'https://media.forgecdn.net/avatars/297/308/637344073217841957.png',
    CONSTRAINT detail_file_fk FOREIGN KEY (file_id) REFERENCES files(file_id)
);
INSERT INTO `detail_file` (`detail_file_id`, `file_id`, `des1`, `des2`, `des3`, `img1`, `img2`, `img3`) VALUES
(1, 1, 'Tổng quan khu spawn', 'Khu trao đổi đồ dân làng', 'Đào đá lên cấp nhận quà, có cúp nổ', 'https://res.cloudinary.com/dopzctbyo/image/upload/v1703074236/minecraft/server-1_dmaosv.png', 'https://res.cloudinary.com/dopzctbyo/image/upload/v1703074333/minecraft/server-2_qfmiev.png', 'https://res.cloudinary.com/dopzctbyo/image/upload/v1703074331/minecraft/server-3_fzwmo4.png'),
(2, 2, 'Mô tả 1', 'Mô tả 2', 'Mô tả 3', 'https://media.forgecdn.net/avatars/297/308/637344073217841957.png', 'https://media.forgecdn.net/avatars/297/308/637344073217841957.png', 'https://media.forgecdn.net/avatars/297/308/637344073217841957.png');

CREATE TABLE users_files (
    user_file_id INT AUTO_INCREMENT PRIMARY KEY,
    users_id INT NOT NULL,
    files_id INT NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_files_fk FOREIGN KEY (users_id) REFERENCES users(id),
    CONSTRAINT users_files_fk_1 FOREIGN KEY (files_id) REFERENCES files(file_id)
);

CREATE TABLE reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    reporter VARCHAR(255) DEFAULT 'Anonymous',
    bug_type VARCHAR(255) NULL,
    bug_detail TEXT NULL,
    bug_level VARCHAR(255) DEFAULT 'NORMAL',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    is_handled BOOLEAN NULL DEFAULT false
);

CREATE TABLE server_metrics (
    stars DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    rates INT NOT NULL DEFAULT 0
);
INSERT INTO `server_metrics` (`stars`, `rates`) VALUES
(4.90, 1),
(4.90, 1),
(4.90, 1);

CREATE TABLE checkins (
    checkin_id INT AUTO_INCREMENT PRIMARY KEY,
    checkin_date TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    users_id INT NOT NULL,
    checkin_count INT NULL DEFAULT 1,
    CONSTRAINT checkins_un UNIQUE (users_id)
);
INSERT INTO `checkins` (`checkin_id`, `checkin_date`, `users_id`, `checkin_count`) VALUES
(1, '2023-12-30', 2, 2);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
