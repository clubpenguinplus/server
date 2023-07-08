/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE TABLE IF NOT EXISTS `auth_tokens` (
  `userId` int NOT NULL,
  `selector` varchar(36) NOT NULL,
  `validator` varchar(60) NOT NULL,
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`,`selector`),
  CONSTRAINT `auth_tokens_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `bans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `issued` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires` datetime NOT NULL,
  `moderatorId` int DEFAULT NULL,
  `message` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `moderatorId` (`moderatorId`),
  CONSTRAINT `bans_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `bans_ibfk_2` FOREIGN KEY (`moderatorId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `beta_keys` (
  `key` varchar(50) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `buddies` (
  `userId` int NOT NULL,
  `buddyId` int NOT NULL,
  `isBff` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`userId`,`buddyId`),
  KEY `buddyId` (`buddyId`),
  CONSTRAINT `buddies_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `buddies_ibfk_2` FOREIGN KEY (`buddyId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `challenges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL DEFAULT '0',
  `challenge_id` int NOT NULL DEFAULT '0',
  `completion` int NOT NULL DEFAULT '0',
  `complete` tinyint(1) NOT NULL DEFAULT '0',
  `set` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `global_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `codes` (
  `id` int NOT NULL,
  `code` varchar(50) NOT NULL,
  `coins` int NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `code_items` (
  `codeId` int NOT NULL,
  `itemId` int NOT NULL,
  PRIMARY KEY (`codeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `flooring_inventories` (
  `userId` int NOT NULL,
  `floorId` int NOT NULL,
  PRIMARY KEY (`userId`,`floorId`),
  CONSTRAINT `flooring_inventories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `furniture_inventories` (
  `userId` int NOT NULL,
  `itemId` int NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`userId`,`itemId`),
  CONSTRAINT `furniture_inventories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `global_challenges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `challenge_id` int NOT NULL DEFAULT '0',
  `set` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `igloo_inventories` (
  `userId` int NOT NULL,
  `iglooId` int NOT NULL,
  PRIMARY KEY (`userId`,`iglooId`),
  CONSTRAINT `igloo_inventories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `igloo_likes` (
  `userId` int NOT NULL,
  `iglooId` int NOT NULL,
  `likerId` int NOT NULL,
  PRIMARY KEY (`userId`,`iglooId`,`likerId`),
  KEY `likerId` (`likerId`),
  CONSTRAINT `igloo_likes_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `igloo_likes_ibfk_2` FOREIGN KEY (`likerId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `ignores` (
  `userId` int NOT NULL,
  `ignoreId` int NOT NULL,
  PRIMARY KEY (`userId`,`ignoreId`),
  KEY `ignoreId` (`ignoreId`),
  CONSTRAINT `ignores_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ignores_ibfk_2` FOREIGN KEY (`ignoreId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `inventories` (
  `userId` int NOT NULL,
  `itemId` int NOT NULL,
  PRIMARY KEY (`userId`,`itemId`),
  CONSTRAINT `inventories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `location_inventories` (
  `userId` int NOT NULL,
  `locationId` int NOT NULL,
  PRIMARY KEY (`userId`,`locationId`),
  CONSTRAINT `location_inventories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `pending_buddies` (
  `sender` int NOT NULL,
  `recipient` int NOT NULL,
  PRIMARY KEY (`sender`,`recipient`),
  KEY `recipient` (`recipient`),
  CONSTRAINT `pending_buddies_ibfk_1` FOREIGN KEY (`sender`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `pending_buddies_ibfk_2` FOREIGN KEY (`recipient`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `quest_completion` (
  `user` int NOT NULL,
  `id` varchar(50) NOT NULL,
  `completion` int NOT NULL DEFAULT '0',
  `info` text,
  PRIMARY KEY (`user`,`id`),
  CONSTRAINT `quest_completion_ibfk_1` FOREIGN KEY (`user`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `twofa` (
  `userId` int NOT NULL,
  `ip` varchar(255) NOT NULL,
  `isAllowed` int NOT NULL DEFAULT '0',
  `code` varchar(255) NOT NULL,
  PRIMARY KEY (`code`),
  KEY `userId` (`userId`),
  CONSTRAINT `twofa_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `used_codes` (
  `codeId` int NOT NULL,
  `userId` int NOT NULL,
  PRIMARY KEY (`codeId`),
  KEY `userId` (`userId`),
  CONSTRAINT `used_codes_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `password` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `loginKey` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `rank` int NOT NULL DEFAULT '1',
  `has2FA` tinyint(1) NOT NULL DEFAULT '0',
  `stealthMode` tinyint(1) NOT NULL DEFAULT '0',
  `permaBan` tinyint(1) NOT NULL DEFAULT '0',
  `joinTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `coins` int NOT NULL DEFAULT '500',
  `head` int NOT NULL DEFAULT '0',
  `face` int NOT NULL DEFAULT '0',
  `neck` int NOT NULL DEFAULT '0',
  `body` int NOT NULL DEFAULT '0',
  `hand` int NOT NULL DEFAULT '0',
  `feet` int NOT NULL DEFAULT '0',
  `color` int NOT NULL DEFAULT '1',
  `photo` int NOT NULL DEFAULT '0',
  `flag` int NOT NULL DEFAULT '0',
  `username_approved` tinyint(1) NOT NULL DEFAULT '0',
  `username_rejected` tinyint(1) NOT NULL DEFAULT '0',
  `ip` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `activationKey` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `emailActivated` tinyint(1) NOT NULL DEFAULT '0',
  `over13` tinyint(1) NOT NULL DEFAULT '1',
  `stampbookColor` int NOT NULL DEFAULT '1',
  `stampbookClasp` int NOT NULL DEFAULT '1',
  `stampbookPattern` int NOT NULL DEFAULT '0',
  `customStamps` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `cannon_data` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `walking` int NOT NULL DEFAULT '0',
  `last_login` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `current_igloo` int NOT NULL DEFAULT '0',
  `epfStatus` int NOT NULL DEFAULT '0',
  `filter` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_furnitures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `iglooId` int NOT NULL,
  `furnitureId` int NOT NULL,
  `x` int NOT NULL,
  `y` int NOT NULL,
  `rotation` int NOT NULL,
  `frame` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_furnitures_ibfk_1` (`userId`),
  CONSTRAINT `user_furnitures_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_igloos` (
  `userId` int NOT NULL,
  `iglooId` int NOT NULL,
  `type` int NOT NULL,
  `flooring` int NOT NULL,
  `music` int NOT NULL,
  `location` int NOT NULL,
  `locked` tinyint(1) NOT NULL,
  PRIMARY KEY (`userId`,`iglooId`),
  CONSTRAINT `user_igloos_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_postcards` (
  `userId` int NOT NULL,
  `id` int NOT NULL,
  `sender` varchar(50) NOT NULL,
  `time_sent` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `details` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`userId`),
  CONSTRAINT `user_postcards_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_puffles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `species` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `food` int NOT NULL DEFAULT '100',
  `play` int NOT NULL DEFAULT '100',
  `rest` int NOT NULL DEFAULT '100',
  `clean` int NOT NULL DEFAULT '100',
  `isBackyard` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `user_puffles_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_stamps` (
  `userId` int NOT NULL,
  `stampId` int NOT NULL,
  PRIMARY KEY (`userId`,`stampId`),
  CONSTRAINT `user_stamps_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
