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
  `selector` char(36) NOT NULL,
  `validator` char(60) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`,`selector`) USING BTREE,
  CONSTRAINT `auth_tokens_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='Authentication tokens for saved logins';


CREATE TABLE IF NOT EXISTS `bans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `issued` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expires` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `moderatorId` int DEFAULT NULL,
  `message` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `moderatorId` (`moderatorId`),
  CONSTRAINT `bans_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `bans_ibfk_2` FOREIGN KEY (`moderatorId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=latin1 COMMENT='User ban records';


CREATE TABLE IF NOT EXISTS `beta_keys` (
  `key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`key`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS `buddies` (
  `userId` int NOT NULL,
  `buddyId` int NOT NULL,
  `isBff` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`userId`,`buddyId`) USING BTREE,
  KEY `buddyId` (`buddyId`),
  CONSTRAINT `buddies_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `buddies_ibfk_2` FOREIGN KEY (`buddyId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='User buddies';


CREATE TABLE IF NOT EXISTS `codes` (
  `id` int NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `coins` int NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS `code_items` (
  `codeId` int NOT NULL,
  `itemId` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`codeId`) USING BTREE,
  KEY `FK_codeitems_items` (`itemId`) USING BTREE,
  CONSTRAINT `FK_codeitems_items` FOREIGN KEY (`itemId`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;


CREATE TABLE IF NOT EXISTS `flooring_inventories` (
  `userId` int NOT NULL,
  `floorId` int NOT NULL,
  PRIMARY KEY (`userId`,`floorId`) USING BTREE,
  CONSTRAINT `flooring_inventories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='User owned igloos';


CREATE TABLE IF NOT EXISTS `furniture_inventories` (
  `userId` int NOT NULL,
  `itemId` int NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`userId`,`itemId`) USING BTREE,
  CONSTRAINT `furniture_inventories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='User owned furniture';


CREATE TABLE IF NOT EXISTS `igloo_inventories` (
  `userId` int NOT NULL,
  `iglooId` int NOT NULL,
  PRIMARY KEY (`userId`,`iglooId`) USING BTREE,
  CONSTRAINT `igloo_inventories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='User owned igloos';


CREATE TABLE IF NOT EXISTS `igloo_likes` (
  `userId` int NOT NULL,
  `iglooId` tinyint NOT NULL,
  `likerId` int NOT NULL,
  PRIMARY KEY (`iglooId`,`userId`,`likerId`) USING BTREE,
  KEY `FK_igloo_likes_users` (`userId`),
  CONSTRAINT `FK_igloo_likes_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS `ignores` (
  `userId` int NOT NULL,
  `ignoreId` int NOT NULL,
  PRIMARY KEY (`userId`,`ignoreId`) USING BTREE,
  KEY `ignoreId` (`ignoreId`),
  CONSTRAINT `ignores_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ignores_ibfk_2` FOREIGN KEY (`ignoreId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='User ignores';


CREATE TABLE IF NOT EXISTS `inventories` (
  `userId` int NOT NULL,
  `itemId` int NOT NULL,
  PRIMARY KEY (`userId`,`itemId`) USING BTREE,
  CONSTRAINT `inventories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='User owned clothing';


CREATE TABLE IF NOT EXISTS `location_inventories` (
  `userId` int NOT NULL,
  `locationId` int NOT NULL,
  PRIMARY KEY (`userId`,`locationId`) USING BTREE,
  CONSTRAINT `location_inventories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='User owned igloos';


CREATE TABLE IF NOT EXISTS `pending_buddies` (
  `sender` int NOT NULL,
  `recipient` int NOT NULL,
  PRIMARY KEY (`sender`,`recipient`) USING BTREE,
  KEY `recipient` (`recipient`) USING BTREE,
  CONSTRAINT `pending_buddies_ibfk_1` FOREIGN KEY (`sender`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `pending_buddies_ibfk_2` FOREIGN KEY (`recipient`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='User pending buddies';


CREATE TABLE IF NOT EXISTS `twofa` (
  `userId` int NOT NULL,
  `ip` text NOT NULL,
  `isAllowed` tinyint(1) NOT NULL DEFAULT '0',
  `code` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`code`(100)),
  KEY `FK_twofa_users` (`userId`),
  CONSTRAINT `FK_twofa_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS `used_codes` (
  `codeId` int NOT NULL,
  `userId` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`codeId`) USING BTREE,
  KEY `FK_usedcodes_users` (`userId`) USING BTREE,
  CONSTRAINT `FK_usedcodes_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;


CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(12) NOT NULL,
  `email` varchar(254) DEFAULT NULL,
  `password` char(60) NOT NULL,
  `loginKey` text,
  `rank` tinyint(1) NOT NULL DEFAULT '1',
  `has2FA` tinyint(1) NOT NULL DEFAULT '0',
  `stealthMode` tinyint(1) NOT NULL DEFAULT '0',
  `permaBan` tinyint(1) NOT NULL DEFAULT '0',
  `joinTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  `ip` text,
  `activationKey` varchar(1000) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `emailActivated` tinyint NOT NULL DEFAULT '0',
  `over13` tinyint(1) NOT NULL DEFAULT '1',
  `timePlayed` int NOT NULL DEFAULT '0',
  `messagesSent` int NOT NULL DEFAULT '0',
  `snowballsThrown` int NOT NULL DEFAULT '0',
  `sledRacesWon` int NOT NULL DEFAULT '0',
  `findFourWon` int NOT NULL DEFAULT '0',
  `coinsEarned` int NOT NULL DEFAULT '0',
  `coinsSpent` int NOT NULL DEFAULT '0',
  `partyTasksCompleted` int NOT NULL DEFAULT '0',
  `hasBeenPOTW` tinyint(1) NOT NULL DEFAULT '0',
  `stampbookColor` tinyint(1) NOT NULL DEFAULT '1',
  `stampbookClasp` tinyint(1) NOT NULL DEFAULT '1',
  `stampbookPattern` tinyint(1) NOT NULL DEFAULT '0',
  `customStamps` varchar(50) NOT NULL DEFAULT '',
  `cannon_data` varchar(1000) DEFAULT '0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#A#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0#0',
  `walking` int NOT NULL DEFAULT '0',
  `last_login` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `current_igloo` tinyint NOT NULL DEFAULT '0',
  `epfStatus` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1025 DEFAULT CHARSET=latin1 COMMENT='Users';


CREATE TABLE IF NOT EXISTS `user_furnitures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `iglooId` tinyint NOT NULL,
  `furnitureId` int NOT NULL,
  `x` smallint NOT NULL DEFAULT '0',
  `y` smallint NOT NULL DEFAULT '0',
  `rotation` smallint NOT NULL DEFAULT '1',
  `frame` smallint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `user_furnitures_ibfk_1` (`userId`),
  CONSTRAINT `user_furnitures_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=392 DEFAULT CHARSET=latin1 COMMENT='Furniture placed inside igloos';


CREATE TABLE IF NOT EXISTS `user_igloos` (
  `userId` int NOT NULL,
  `iglooId` tinyint NOT NULL,
  `type` int NOT NULL DEFAULT '1',
  `flooring` int NOT NULL DEFAULT '0',
  `music` int NOT NULL DEFAULT '0',
  `location` int NOT NULL DEFAULT '1',
  `locked` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`userId`,`iglooId`) USING BTREE,
  CONSTRAINT `user_igloos_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='User igloo settings';


CREATE TABLE IF NOT EXISTS `user_postcards` (
  `userId` int NOT NULL,
  `id` int NOT NULL,
  `sender` varchar(50) NOT NULL,
  `time_sent` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `details` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`userId`) USING BTREE,
  CONSTRAINT `FK_user_postcards_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS `user_puffles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `color` int NOT NULL,
  `name` varchar(50) NOT NULL DEFAULT '',
  `food` int NOT NULL DEFAULT '100',
  `play` int NOT NULL DEFAULT '100',
  `rest` int NOT NULL DEFAULT '100',
  `clean` int NOT NULL DEFAULT '100',
  PRIMARY KEY (`id`),
  KEY `FK_user_puffles_users` (`userId`),
  CONSTRAINT `FK_user_puffles_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=109 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS `user_stamps` (
  `userId` int NOT NULL,
  `stampId` int NOT NULL,
  PRIMARY KEY (`userId`,`stampId`),
  CONSTRAINT `FK_user_stamps_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `trigger_users_insert` AFTER INSERT ON `users` FOR EACH ROW BEGIN
    INSERT INTO user_igloos (userId, iglooId) VALUES (NEW.id, 0);
    INSERT INTO igloo_inventories (userId, iglooId) VALUES (NEW.id, 0);
    INSERT INTO igloo_inventories (userId, iglooId) VALUES (NEW.id, 1);
    INSERT INTO location_inventories (userId, locationId) VALUES (NEW.id, 1);
    INSERT INTO flooring_inventories (userId, floorId) VALUES (NEW.id, 0);
    INSERT INTO inventories (userId, itemId) VALUES (NEW.id, NEW.color);
    INSERT INTO inventories (userId, itemId) VALUES (NEW.id, 1285);
    INSERT INTO inventories (userId, itemId) VALUES (NEW.id, 9106);
    INSERT INTO furniture_inventories (userId, itemId, quantity) VALUES (NEW.id, 788, 1);
    INSERT INTO furniture_inventories (userId, itemId, quantity) VALUES (NEW.id, 793, 1);
    INSERT INTO furniture_inventories (userId, itemId, quantity) VALUES (NEW.id, 792, 1);
    INSERT INTO furniture_inventories (userId, itemId, quantity) VALUES (NEW.id, 790, 1);
    INSERT INTO furniture_inventories (userId, itemId, quantity) VALUES (NEW.id, 787, 1);
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
