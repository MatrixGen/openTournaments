-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: localhost    Database: gamersaloon
-- ------------------------------------------------------
-- Server version	8.0.43-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `SequelizeMeta`
--

DROP TABLE IF EXISTS `SequelizeMeta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SequelizeMeta` (
  `name` varchar(255) COLLATE utf8mb3_unicode_ci NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SequelizeMeta`
--

LOCK TABLES `SequelizeMeta` WRITE;
/*!40000 ALTER TABLE `SequelizeMeta` DISABLE KEYS */;
INSERT INTO `SequelizeMeta` VALUES ('20250915123056-create-user.js');
/*!40000 ALTER TABLE `SequelizeMeta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `disputes`
--

DROP TABLE IF EXISTS `disputes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `disputes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `match_id` int NOT NULL,
  `raised_by_user_id` int NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `evidence_url` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('open','under_review','resolved') COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `resolution_details` text COLLATE utf8mb4_unicode_ci,
  `resolved_by_admin_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_disputes_match_id` (`match_id`),
  KEY `idx_disputes_raised_by` (`raised_by_user_id`),
  KEY `resolved_by_admin_id` (`resolved_by_admin_id`),
  CONSTRAINT `disputes_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`),
  CONSTRAINT `disputes_ibfk_2` FOREIGN KEY (`raised_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `disputes_ibfk_3` FOREIGN KEY (`resolved_by_admin_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `disputes`
--

LOCK TABLES `disputes` WRITE;
/*!40000 ALTER TABLE `disputes` DISABLE KEYS */;
/*!40000 ALTER TABLE `disputes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `friend_requests`
--

DROP TABLE IF EXISTS `friend_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `friend_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `status` enum('pending','accepted','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_friend_request` (`sender_id`,`receiver_id`),
  KEY `receiver_id` (`receiver_id`),
  CONSTRAINT `friend_requests_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`),
  CONSTRAINT `friend_requests_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `friend_requests`
--

LOCK TABLES `friend_requests` WRITE;
/*!40000 ALTER TABLE `friend_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `friend_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `friends`
--

DROP TABLE IF EXISTS `friends`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `friends` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `friend_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_friendship` (`user_id`,`friend_id`),
  KEY `friend_id` (`friend_id`),
  CONSTRAINT `friends_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `friends_ibfk_2` FOREIGN KEY (`friend_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `friends`
--

LOCK TABLES `friends` WRITE;
/*!40000 ALTER TABLE `friends` DISABLE KEYS */;
/*!40000 ALTER TABLE `friends` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `game_modes`
--

DROP TABLE IF EXISTS `game_modes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_modes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `game_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `game_id` (`game_id`),
  CONSTRAINT `game_modes_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `game_modes`
--

LOCK TABLES `game_modes` WRITE;
/*!40000 ALTER TABLE `game_modes` DISABLE KEYS */;
INSERT INTO `game_modes` VALUES (1,1,'Quick Match','active','2025-09-15 15:21:21','2025-09-15 15:21:21'),(2,1,'Online Quick Match','active','2025-09-15 15:21:21','2025-09-15 15:21:21'),(3,2,'Online Match','active','2025-09-15 15:21:21','2025-09-15 15:21:21'),(4,3,'Head-to-Head','active','2025-09-15 15:21:21','2025-09-15 15:21:21'),(5,3,'VS Attack','active','2025-09-15 15:21:21','2025-09-15 15:21:21');
/*!40000 ALTER TABLE `game_modes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `games`
--

DROP TABLE IF EXISTS `games`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `games` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logo_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `games`
--

LOCK TABLES `games` WRITE;
/*!40000 ALTER TABLE `games` DISABLE KEYS */;
INSERT INTO `games` VALUES (1,'eFootball 2024',NULL,'active','2025-09-15 15:21:21','2025-09-15 15:21:21'),(2,'Dream League Soccer 2024',NULL,'active','2025-09-15 15:21:21','2025-09-15 15:21:21'),(3,'EA Sports FC Mobile',NULL,'active','2025-09-15 15:21:21','2025-09-15 15:21:21');
/*!40000 ALTER TABLE `games` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matches`
--

DROP TABLE IF EXISTS `matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `round_number` int NOT NULL,
  `bracket_type` enum('winners','losers','finals') COLLATE utf8mb4_unicode_ci DEFAULT 'winners',
  `participant1_id` int NOT NULL,
  `participant2_id` int NOT NULL,
  `participant1_score` int DEFAULT '0',
  `participant2_score` int DEFAULT '0',
  `status` enum('scheduled','completed','disputed','awaiting_confirmation') COLLATE utf8mb4_unicode_ci DEFAULT 'scheduled',
  `scheduled_time` datetime DEFAULT NULL,
  `reported_by_user_id` int DEFAULT NULL,
  `winner_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reported_at` timestamp NULL DEFAULT NULL,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `confirmed_by_user_id` int DEFAULT NULL,
  `auto_verified` tinyint(1) DEFAULT '0',
  `evidence_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_matches_tournament_id` (`tournament_id`),
  KEY `idx_matches_participant1` (`participant1_id`),
  KEY `idx_matches_participant2` (`participant2_id`),
  KEY `reported_by_user_id` (`reported_by_user_id`),
  KEY `winner_id` (`winner_id`),
  KEY `fk_matches_confirmed_by` (`confirmed_by_user_id`),
  CONSTRAINT `fk_matches_confirmed_by` FOREIGN KEY (`confirmed_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `matches_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `matches_ibfk_2` FOREIGN KEY (`participant1_id`) REFERENCES `tournament_participants` (`id`),
  CONSTRAINT `matches_ibfk_3` FOREIGN KEY (`participant2_id`) REFERENCES `tournament_participants` (`id`),
  CONSTRAINT `matches_ibfk_4` FOREIGN KEY (`reported_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `matches_ibfk_5` FOREIGN KEY (`winner_id`) REFERENCES `tournament_participants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matches`
--

LOCK TABLES `matches` WRITE;
/*!40000 ALTER TABLE `matches` DISABLE KEYS */;
INSERT INTO `matches` VALUES (1,6,1,'winners',2,3,0,0,'scheduled',NULL,NULL,NULL,'2025-09-16 09:50:29',NULL,NULL,NULL,0,NULL,'2025-09-16 09:50:29'),(2,6,1,'winners',4,5,0,0,'scheduled',NULL,NULL,NULL,'2025-09-16 09:50:29',NULL,NULL,NULL,0,NULL,'2025-09-16 09:50:29'),(3,17,1,'winners',8,9,0,0,'awaiting_confirmation',NULL,7,NULL,'2025-09-18 18:37:40',NULL,NULL,NULL,0,NULL,'2025-09-19 10:39:14'),(4,25,1,'winners',25,24,2,0,'awaiting_confirmation',NULL,6,NULL,'2025-09-20 10:01:32',NULL,NULL,NULL,0,NULL,'2025-09-20 10:03:52'),(5,26,1,'winners',26,27,0,1,'awaiting_confirmation',NULL,6,NULL,'2025-09-20 10:23:51',NULL,NULL,NULL,0,NULL,'2025-09-20 10:25:50'),(6,27,1,'winners',29,28,0,0,'scheduled',NULL,NULL,NULL,'2025-09-20 10:38:53',NULL,NULL,NULL,0,NULL,'2025-09-20 10:38:53'),(7,36,1,'winners',38,37,3,2,'completed',NULL,6,38,'2025-09-21 11:25:05',NULL,NULL,7,0,NULL,'2025-09-21 11:49:52'),(8,37,1,'winners',40,39,2,0,'completed',NULL,7,40,'2025-09-21 11:59:19',NULL,NULL,6,0,NULL,'2025-09-21 12:19:15'),(9,38,1,'winners',41,42,0,0,'scheduled',NULL,NULL,NULL,'2025-09-21 12:24:01',NULL,NULL,NULL,0,NULL,'2025-09-21 12:24:01'),(10,40,1,'winners',46,45,4,3,'completed',NULL,7,46,'2025-09-21 12:48:46',NULL,NULL,6,0,NULL,'2025-09-21 15:46:28'),(11,41,1,'winners',48,47,0,0,'awaiting_confirmation',NULL,6,NULL,'2025-09-21 12:55:41',NULL,NULL,NULL,0,NULL,'2025-09-21 15:51:27'),(12,42,1,'winners',49,50,0,0,'scheduled',NULL,NULL,NULL,'2025-09-21 16:14:47',NULL,NULL,NULL,0,NULL,'2025-09-21 16:14:47'),(13,43,1,'winners',52,51,2,3,'completed',NULL,7,51,'2025-09-21 16:31:18',NULL,NULL,6,0,NULL,'2025-09-21 16:51:06'),(14,44,1,'winners',54,53,0,0,'scheduled',NULL,NULL,NULL,'2025-09-21 16:54:44',NULL,NULL,NULL,0,NULL,'2025-09-21 16:54:44'),(15,45,1,'winners',55,56,0,0,'scheduled',NULL,NULL,NULL,'2025-09-21 17:17:13',NULL,NULL,NULL,0,NULL,'2025-09-21 17:17:13'),(16,47,1,'winners',58,59,0,2,'awaiting_confirmation',NULL,6,NULL,'2025-09-21 19:41:45',NULL,NULL,NULL,0,NULL,'2025-09-21 19:44:27'),(17,48,1,'winners',60,61,0,0,'scheduled',NULL,NULL,NULL,'2025-09-23 13:42:56',NULL,NULL,NULL,0,NULL,'2025-09-23 13:42:56'),(18,49,1,'winners',63,62,1,3,'completed',NULL,7,62,'2025-09-23 20:33:16',NULL,NULL,6,0,NULL,'2025-09-24 12:19:10'),(19,50,1,'winners',66,65,0,0,'scheduled',NULL,NULL,NULL,'2025-09-26 10:08:01',NULL,NULL,NULL,0,NULL,'2025-09-26 10:08:01'),(20,50,1,'winners',64,67,0,0,'scheduled',NULL,NULL,NULL,'2025-09-26 10:08:01',NULL,NULL,NULL,0,NULL,'2025-09-26 10:08:01'),(25,53,1,'winners',74,75,0,0,'scheduled',NULL,NULL,NULL,'2025-09-26 13:27:42',NULL,NULL,NULL,0,NULL,'2025-09-26 13:27:42'),(28,54,1,'winners',76,78,0,0,'scheduled',NULL,NULL,NULL,'2025-09-29 12:28:46',NULL,NULL,NULL,0,NULL,'2025-09-29 12:28:46'),(29,54,1,'winners',77,79,0,0,'scheduled',NULL,NULL,NULL,'2025-09-29 12:28:46',NULL,NULL,NULL,0,NULL,'2025-09-29 12:28:46'),(30,55,1,'winners',82,81,0,0,'scheduled',NULL,NULL,NULL,'2025-09-29 13:49:48',NULL,NULL,NULL,0,NULL,'2025-09-29 13:49:48'),(31,55,1,'winners',82,80,0,0,'scheduled',NULL,NULL,NULL,'2025-09-29 13:49:48',NULL,NULL,NULL,0,NULL,'2025-09-29 13:49:48'),(32,55,1,'winners',82,83,0,0,'scheduled',NULL,NULL,NULL,'2025-09-29 13:49:48',NULL,NULL,NULL,0,NULL,'2025-09-29 13:49:48'),(33,55,1,'winners',81,80,0,0,'scheduled',NULL,NULL,NULL,'2025-09-29 13:49:48',NULL,NULL,NULL,0,NULL,'2025-09-29 13:49:48'),(34,55,1,'winners',81,83,0,0,'scheduled',NULL,NULL,NULL,'2025-09-29 13:49:48',NULL,NULL,NULL,0,NULL,'2025-09-29 13:49:48'),(35,55,1,'winners',80,83,0,0,'scheduled',NULL,NULL,NULL,'2025-09-29 13:49:48',NULL,NULL,NULL,0,NULL,'2025-09-29 13:49:48'),(36,51,1,'winners',69,70,0,0,'scheduled',NULL,NULL,NULL,'2025-09-29 14:01:46',NULL,NULL,NULL,0,NULL,'2025-09-29 14:01:46'),(37,51,1,'winners',73,68,0,0,'scheduled',NULL,NULL,NULL,'2025-09-29 14:01:46',NULL,NULL,NULL,0,NULL,'2025-09-29 14:01:46');
/*!40000 ALTER TABLE `matches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `related_entity_type` enum('tournament','match','user','transaction') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_entity_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=150 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,6,'New Participant','User Matrix has joined your tournament \"Spring Championship\"','tournament',1,'tournament',7,'2025-09-17 15:51:56','2025-09-19 14:27:29'),(2,6,'New Participant','User Matrix has joined your tournament \"18sept Tournament\"','tournament',1,'tournament',16,'2025-09-18 13:03:39','2025-09-19 14:27:29'),(3,7,'New Participant','User edisona has joined your tournament \"Tanzania Cup\"','tournament',1,'tournament',17,'2025-09-18 18:35:48','2025-09-20 07:47:56'),(4,7,'New Participant','User Matrix has joined your tournament \"Tanzania Cup\"','tournament',1,'tournament',17,'2025-09-18 18:37:40','2025-09-19 19:42:14'),(5,6,'Score Reported','Your opponent has reported a score for your match. Please confirm or dispute the result.','match',1,'match',3,'2025-09-19 10:39:14','2025-09-19 14:27:29'),(6,7,'New Participant','User edisona has joined your tournament \"Diamond Cup\"','tournament',1,'tournament',19,'2025-09-20 07:58:27','2025-09-20 10:35:58'),(7,7,'New Participant','User Matrix has joined your tournament \"Diamond Cup\"','tournament',1,'tournament',19,'2025-09-20 08:30:32','2025-09-20 10:35:58'),(8,6,'New Participant','User Matrix has joined your tournament \"test tournament\"','tournament',1,'tournament',20,'2025-09-20 08:51:40','2025-09-20 13:52:19'),(9,6,'New Participant','User edisona has joined your tournament \"test tournament\"','tournament',1,'tournament',20,'2025-09-20 08:52:48','2025-09-20 13:52:38'),(10,7,'New Participant','User edisona has joined your tournament \"New yearTournament\"','tournament',1,'tournament',21,'2025-09-20 09:13:28','2025-09-20 10:35:58'),(11,7,'New Participant','User Matrix has joined your tournament \"New yearTournament\"','tournament',1,'tournament',21,'2025-09-20 09:15:34','2025-09-20 10:35:58'),(12,6,'New Participant','User Matrix has joined your tournament \"20-sept Tournament\"','tournament',1,'tournament',22,'2025-09-20 09:22:22','2025-09-20 09:24:21'),(13,6,'New Participant','User Matrix has joined your tournament \"testing1 tournament\"','tournament',1,'tournament',23,'2025-09-20 09:27:28','2025-09-20 13:53:00'),(14,6,'New Participant','User Matrix has joined your tournament \"Supercup\"','tournament',1,'tournament',24,'2025-09-20 09:34:48','2025-09-20 13:53:02'),(15,6,'New Participant','User edisona has joined your tournament \"Supercup\"','tournament',1,'tournament',24,'2025-09-20 09:36:21','2025-09-21 11:56:57'),(16,7,'New Participant','User edisona has joined your tournament \"18sept Tournament\"','tournament',1,'tournament',25,'2025-09-20 09:59:57','2025-09-20 10:35:58'),(17,7,'New Participant','User Matrix has joined your tournament \"18sept Tournament\"','tournament',1,'tournament',25,'2025-09-20 10:01:32','2025-09-20 10:35:58'),(18,7,'Score Reported','Your opponent has reported a score for your match. Please confirm or dispute the result.','match',1,'match',4,'2025-09-20 10:03:52','2025-09-20 10:05:23'),(19,7,'New Participant','User edisona has joined your tournament \"Tanzania Cup\"','tournament',1,'tournament',26,'2025-09-20 10:22:49','2025-09-20 10:35:58'),(20,7,'New Participant','User Matrix has joined your tournament \"Tanzania Cup\"','tournament',1,'tournament',26,'2025-09-20 10:23:51','2025-09-20 10:27:34'),(21,7,'Score Reported','Your opponent has reported a score for your match. Please confirm or dispute the result.','match',1,'match',5,'2025-09-20 10:25:50','2025-09-20 10:26:53'),(22,7,'New Participant','User edisona has joined your tournament \"20 -sept challenge\"','tournament',0,'tournament',27,'2025-09-20 10:38:01','2025-09-20 10:38:01'),(23,7,'New Participant','User Matrix has joined your tournament \"20 -sept challenge\"','tournament',0,'tournament',27,'2025-09-20 10:38:53','2025-09-20 10:38:53'),(24,7,'Tournament Created','You\'ve successfully created and joined the tournament \"Night Stand\".','tournament',0,'tournament',31,'2025-09-20 18:59:24','2025-09-20 18:59:24'),(25,7,'Tournament Created','You\'ve successfully created and joined the tournament \"refund test\".','tournament',0,'tournament',32,'2025-09-20 19:02:42','2025-09-20 19:02:42'),(26,7,'Tournament Created','You\'ve successfully created and joined the tournament \"test refund\".','tournament',0,'tournament',33,'2025-09-20 19:14:00','2025-09-20 19:14:00'),(28,7,'Tournament Cancelled','The tournament \"test refund\" has been cancelled by the creator. Your entry fee of 10 has been refunded.','tournament',0,'tournament',33,'2025-09-20 19:26:51','2025-09-20 19:26:51'),(29,7,'Tournament Created','You\'ve successfully created and joined the tournament \"Sunday Cup\".','tournament',0,'tournament',34,'2025-09-21 10:35:19','2025-09-21 10:35:19'),(30,7,'New Participant','User Matrix has joined your tournament \"Sunday Cup\"','tournament',0,'tournament',34,'2025-09-21 10:36:21','2025-09-21 10:36:21'),(31,6,'Tournament Created','You\'ve successfully created and joined the tournament \"Tanzania Cup\".','tournament',1,'tournament',35,'2025-09-21 11:10:32','2025-09-21 11:56:57'),(32,6,'New Participant','User edisona has joined your tournament \"Tanzania Cup\"','tournament',1,'tournament',35,'2025-09-21 11:11:30','2025-09-21 11:56:57'),(33,7,'Tournament Created','You\'ve successfully created and joined the tournament \"Sunday FIFA\".','tournament',0,'tournament',36,'2025-09-21 11:24:21','2025-09-21 11:24:21'),(34,7,'New Participant','User Matrix has joined your tournament \"Sunday FIFA\"','tournament',0,'tournament',36,'2025-09-21 11:25:05','2025-09-21 11:25:05'),(35,7,'Score Reported','Your opponent has reported a score for your match. Please confirm or dispute the result.','match',1,'match',7,'2025-09-21 11:26:10','2025-09-21 11:27:01'),(36,6,'Tournament Created','You\'ve successfully created and joined the tournament \"Tanzania Cup\".','tournament',0,'tournament',37,'2025-09-21 11:58:05','2025-09-21 11:58:05'),(37,6,'New Participant','User edisona has joined your tournament \"Tanzania Cup\"','tournament',0,'tournament',37,'2025-09-21 11:59:19','2025-09-21 11:59:19'),(38,6,'Score Reported','Your opponent has reported a score for your match. Please confirm or dispute the result.','match',1,'match',8,'2025-09-21 12:00:13','2025-09-21 12:01:54'),(40,7,'Tournament Created','You\'ve successfully created and joined the tournament \"Wallet pumper\".','tournament',0,'tournament',38,'2025-09-21 12:22:51','2025-09-21 12:22:51'),(41,7,'New Participant','User Matrix has joined your tournament \"Wallet pumper\"','tournament',0,'tournament',38,'2025-09-21 12:24:01','2025-09-21 12:24:01'),(42,6,'Tournament Created','You\'ve successfully created and joined the tournament \"Wallet checker\".','tournament',0,'tournament',39,'2025-09-21 12:36:31','2025-09-21 12:36:31'),(43,6,'Tournament Starting','The tournament \"Wallet checker\" is now full and has been locked. The bracket has been generated.','tournament',0,'tournament',39,'2025-09-21 12:38:07','2025-09-21 12:38:07'),(45,6,'Bracket Generation Failed','Tournament \"Wallet checker\" is full but bracket generation failed. Please contact support.','error',0,'tournament',39,'2025-09-21 12:38:59','2025-09-21 12:38:59'),(46,6,'New Participant','User edisona has joined your tournament \"Wallet checker\".','tournament',0,'tournament',39,'2025-09-21 12:38:59','2025-09-21 12:38:59'),(47,7,'Tournament Joined','You have successfully joined the tournament \"Wallet checker\".','tournament',0,'tournament',39,'2025-09-21 12:39:00','2025-09-21 12:39:00'),(48,7,'Tournament Created','You\'ve successfully created and joined the tournament \"Tanzania Cup\".','tournament',0,'tournament',40,'2025-09-21 12:47:59','2025-09-21 12:47:59'),(50,7,'Bracket Generation Failed','Tournament \"Tanzania Cup\" is full but bracket generation failed. Please contact support.','error',0,'tournament',40,'2025-09-21 12:49:36','2025-09-21 12:49:36'),(51,7,'New Participant','User Matrix has joined your tournament \"Tanzania Cup\".','tournament',0,'tournament',40,'2025-09-21 12:49:36','2025-09-21 12:49:36'),(52,6,'Tournament Joined','You have successfully joined the tournament \"Tanzania Cup\".','tournament',0,'tournament',40,'2025-09-21 12:49:38','2025-09-21 12:49:38'),(53,6,'Tournament Created','You\'ve successfully created and joined the tournament \"18sept Tournament\".','tournament',0,'tournament',41,'2025-09-21 12:54:24','2025-09-21 12:54:24'),(54,6,'New Participant','User edisona has joined your tournament \"18sept Tournament\"','tournament',0,'tournament',41,'2025-09-21 12:55:41','2025-09-21 12:55:41'),(55,6,'Score Reported','Your opponent has reported a score for your match. Please confirm or dispute the result.','match',1,'match',10,'2025-09-21 15:45:38','2025-09-21 15:46:16'),(56,7,'Score Reported','Your opponent has reported a score for your match. Please confirm or dispute the result.','match',1,'match',11,'2025-09-21 15:51:27','2025-09-21 15:52:13'),(57,7,'Tournament Created','You\'ve successfully created and joined the tournament \"Iphone competition\".','tournament',0,'tournament',42,'2025-09-21 16:11:38','2025-09-21 16:11:38'),(58,7,'New Participant','User Matrix has joined your tournament \"Iphone competition\"','tournament',0,'tournament',42,'2025-09-21 16:14:47','2025-09-21 16:14:47'),(59,6,'Tournament Created','You\'ve successfully created and joined the tournament \"18sept Tournament\".','tournament',0,'tournament',43,'2025-09-21 16:29:59','2025-09-21 16:29:59'),(60,6,'New Participant','User edisona has joined your tournament \"18sept Tournament\"','tournament',0,'tournament',43,'2025-09-21 16:31:19','2025-09-21 16:31:19'),(61,6,'Score Reported','Your opponent has reported a score for your match. Please confirm or dispute the result.','match',1,'match',13,'2025-09-21 16:49:57','2025-09-21 16:50:50'),(62,6,'Tournament Created','You\'ve successfully created and joined the tournament \"Tanzania Cup\".','tournament',0,'tournament',44,'2025-09-21 16:53:11','2025-09-21 16:53:11'),(63,6,'Tournament Starting','The tournament \"Tanzania Cup\" is now full and bracket has been generated.','tournament',0,'tournament',44,'2025-09-21 16:54:44','2025-09-21 16:54:44'),(65,6,'Bracket Generation Failed','Tournament \"Tanzania Cup\" is full but bracket generation failed. Please contact support.','error',0,'tournament',44,'2025-09-21 16:55:35','2025-09-21 16:55:35'),(66,6,'New Participant','User edisona joined your tournament \"Tanzania Cup\".','tournament',0,'tournament',44,'2025-09-21 16:55:36','2025-09-21 16:55:36'),(67,7,'Tournament Joined','You successfully joined \"Tanzania Cup\".','tournament',0,'tournament',44,'2025-09-21 16:55:37','2025-09-21 16:55:37'),(68,7,'Tournament Created','You\'ve successfully created and joined the tournament \"19 SEPT\".','tournament',0,'tournament',45,'2025-09-21 17:16:26','2025-09-21 17:16:26'),(69,6,'Tournament Starting','The tournament \"19 SEPT\" is now full and live. The bracket has been generated.','tournament',0,'tournament',45,'2025-09-21 17:17:13','2025-09-21 17:17:13'),(70,7,'Tournament Starting','The tournament \"19 SEPT\" is now full and live. The bracket has been generated.','tournament',0,'tournament',45,'2025-09-21 17:17:15','2025-09-21 17:17:15'),(71,7,'New Participant','User Matrix has joined your tournament \"19 SEPT\".','tournament',0,'tournament',45,'2025-09-21 17:17:16','2025-09-21 17:17:16'),(72,6,'Tournament Joined','You have successfully joined the tournament \"19 SEPT\".','tournament',0,'tournament',45,'2025-09-21 17:17:17','2025-09-21 17:17:17'),(73,6,'Tournament Created','You\'ve successfully created and joined the tournament \"18sept Tournament\".','tournament',0,'tournament',46,'2025-09-21 19:23:54','2025-09-21 19:23:54'),(74,6,'Tournament Cancelled','The tournament \"18sept Tournament\" has been cancelled by the creator. Your entry fee of 1 has been refunded.','tournament',0,'tournament',46,'2025-09-21 19:24:35','2025-09-21 19:24:35'),(75,7,'Tournament Created','You\'ve successfully created and joined the tournament \"Emailer Tournament\".','tournament',0,'tournament',47,'2025-09-21 19:40:22','2025-09-21 19:40:22'),(76,6,'Tournament Starting','The tournament \"Emailer Tournament\" is now full and live. The bracket has been generated.','tournament',0,'tournament',47,'2025-09-21 19:41:45','2025-09-21 19:41:45'),(77,7,'Tournament Starting','The tournament \"Emailer Tournament\" is now full and live. The bracket has been generated.','tournament',0,'tournament',47,'2025-09-21 19:41:49','2025-09-21 19:41:49'),(78,7,'New Participant','User Matrix has joined your tournament \"Emailer Tournament\".','tournament',0,'tournament',47,'2025-09-21 19:41:52','2025-09-21 19:41:52'),(79,6,'Tournament Joined','You have successfully joined the tournament \"Emailer Tournament\".','tournament',1,'tournament',47,'2025-09-21 19:41:56','2025-09-21 19:43:49'),(80,7,'Score Reported','Your opponent has reported a score for your match. Please confirm or dispute the result.','match',0,'match',16,'2025-09-21 19:44:28','2025-09-21 19:44:28'),(81,6,'Tournament Created','You\'ve successfully created and joined the tournament \"18sept Tournament\".','tournament',0,'tournament',48,'2025-09-23 13:41:31','2025-09-23 13:41:31'),(82,6,'Tournament Starting','The tournament \"18sept Tournament\" is now full and live. The bracket has been generated.','tournament',0,'tournament',48,'2025-09-23 13:42:56','2025-09-23 13:42:56'),(83,7,'Tournament Starting','The tournament \"18sept Tournament\" is now full and live. The bracket has been generated.','tournament',0,'tournament',48,'2025-09-23 13:42:59','2025-09-23 13:42:59'),(84,6,'New Participant','User edisona has joined your tournament \"18sept Tournament\".','tournament',0,'tournament',48,'2025-09-23 13:43:02','2025-09-23 13:43:02'),(85,7,'Tournament Joined','You have successfully joined the tournament \"18sept Tournament\".','tournament',0,'tournament',48,'2025-09-23 13:43:08','2025-09-23 13:43:08'),(86,6,'Tournament Created','You\'ve successfully created and joined the tournament \"18sept Tournament\".','tournament',0,'tournament',49,'2025-09-23 20:32:15','2025-09-23 20:32:15'),(87,6,'Tournament Starting','The tournament \"18sept Tournament\" is now full and live. The bracket has been generated.','tournament',0,'tournament',49,'2025-09-23 20:33:16','2025-09-23 20:33:16'),(88,7,'Tournament Starting','The tournament \"18sept Tournament\" is now full and live. The bracket has been generated.','tournament',0,'tournament',49,'2025-09-23 20:33:20','2025-09-23 20:33:20'),(89,6,'New Participant','User edisona has joined your tournament \"18sept Tournament\".','tournament',1,'tournament',49,'2025-09-23 20:33:25','2025-09-24 12:23:29'),(90,7,'Tournament Joined','You have successfully joined the tournament \"18sept Tournament\".','tournament',0,'tournament',49,'2025-09-23 20:33:28','2025-09-23 20:33:28'),(91,6,'Score Reported','Your opponent has reported a score for your match. Please confirm or dispute the result.','match',1,'match',18,'2025-09-23 21:42:21','2025-09-24 12:18:21'),(92,9,'Tournament Created','You\'ve successfully created and joined the tournament \"De princehope\".','tournament',0,'tournament',50,'2025-09-26 09:46:00','2025-09-26 09:46:00'),(93,9,'New Participant','User Matrix has joined your tournament \"De princehope\".','tournament',0,'tournament',50,'2025-09-26 10:04:56','2025-09-26 10:04:56'),(94,6,'Tournament Joined','You have successfully joined the tournament \"De princehope\".','tournament',0,'tournament',50,'2025-09-26 10:04:56','2025-09-26 10:04:56'),(95,9,'New Participant','User user1 has joined your tournament \"De princehope\".','tournament',0,'tournament',50,'2025-09-26 10:06:11','2025-09-26 10:06:11'),(96,10,'Tournament Joined','You have successfully joined the tournament \"De princehope\".','tournament',0,'tournament',50,'2025-09-26 10:06:11','2025-09-26 10:06:11'),(97,6,'Tournament Starting','The tournament \"De princehope\" is now full and live. The bracket has been generated.','tournament',0,'tournament',50,'2025-09-26 10:08:01','2025-09-26 10:08:01'),(98,9,'Tournament Starting','The tournament \"De princehope\" is now full and live. The bracket has been generated.','tournament',0,'tournament',50,'2025-09-26 10:08:05','2025-09-26 10:08:05'),(99,10,'Tournament Starting','The tournament \"De princehope\" is now full and live. The bracket has been generated.','tournament',0,'tournament',50,'2025-09-26 10:08:08','2025-09-26 10:08:08'),(100,11,'Tournament Starting','The tournament \"De princehope\" is now full and live. The bracket has been generated.','tournament',1,'tournament',50,'2025-09-26 10:08:12','2025-09-30 13:09:59'),(101,9,'New Participant','User user4 has joined your tournament \"De princehope\".','tournament',0,'tournament',50,'2025-09-26 10:08:15','2025-09-26 10:08:15'),(102,11,'Tournament Joined','You have successfully joined the tournament \"De princehope\".','tournament',1,'tournament',50,'2025-09-26 10:08:15','2025-09-30 13:09:59'),(103,11,'Tournament Created','You\'ve successfully created and joined the tournament \"Princehope tech challenge\".','tournament',1,'tournament',51,'2025-09-26 10:14:37','2025-09-30 13:09:59'),(104,11,'New Participant','User Matrix has joined your tournament \"Princehope tech challenge\".','tournament',1,'tournament',51,'2025-09-26 10:15:39','2025-09-30 13:09:59'),(105,6,'Tournament Joined','You have successfully joined the tournament \"Princehope tech challenge\".','tournament',0,'tournament',51,'2025-09-26 10:15:39','2025-09-26 10:15:39'),(106,11,'New Participant','User user3 has joined your tournament \"Princehope tech challenge\".','tournament',1,'tournament',51,'2025-09-26 10:21:10','2025-09-30 13:09:59'),(107,9,'Tournament Joined','You have successfully joined the tournament \"Princehope tech challenge\".','tournament',0,'tournament',51,'2025-09-26 10:21:10','2025-09-26 10:21:10'),(108,10,'Tournament Created','You\'ve successfully created and joined the tournament \"TUMAINI\".','tournament',0,'tournament',52,'2025-09-26 10:35:35','2025-09-26 10:35:35'),(109,10,'New Participant','User user3 has joined your tournament \"TUMAINI\".','tournament',0,'tournament',52,'2025-09-26 10:36:15','2025-09-26 10:36:15'),(110,9,'Tournament Joined','You have successfully joined the tournament \"TUMAINI\".','tournament',0,'tournament',52,'2025-09-26 10:36:15','2025-09-26 10:36:15'),(111,11,'New Participant','User user1 has joined your tournament \"Princehope tech challenge\".','tournament',1,'tournament',51,'2025-09-26 12:17:56','2025-09-30 13:09:59'),(112,10,'Tournament Joined','You have successfully joined the tournament \"Princehope tech challenge\".','tournament',0,'tournament',51,'2025-09-26 12:17:56','2025-09-26 12:17:56'),(113,9,'Tournament Created','You\'ve successfully created and joined the tournament \"De princehope\".','tournament',0,'tournament',53,'2025-09-26 13:27:12','2025-09-26 13:27:12'),(114,9,'Tournament Starting','The tournament \"De princehope\" is now full and live. The bracket has been generated.','tournament',0,'tournament',53,'2025-09-26 13:27:42','2025-09-26 13:27:42'),(115,11,'Tournament Starting','The tournament \"De princehope\" is now full and live. The bracket has been generated.','tournament',1,'tournament',53,'2025-09-26 13:27:46','2025-09-30 13:09:59'),(116,9,'New Participant','User user4 has joined your tournament \"De princehope\".','tournament',0,'tournament',53,'2025-09-26 13:27:49','2025-09-26 13:27:49'),(117,11,'Tournament Joined','You have successfully joined the tournament \"De princehope\".','tournament',1,'tournament',53,'2025-09-26 13:27:49','2025-09-30 13:09:59'),(118,9,'Tournament Cancelled','The tournament \"TUMAINI\" has been cancelled by the creator. Your entry fee of 1 has been refunded.','tournament',0,'tournament',52,'2025-09-29 07:22:00','2025-09-29 07:22:00'),(119,10,'Tournament Cancelled','The tournament \"TUMAINI\" has been cancelled by the creator. Your entry fee of 1 has been refunded.','tournament',0,'tournament',52,'2025-09-29 07:22:04','2025-09-29 07:22:04'),(120,10,'Tournament Created','You\'ve successfully created and joined the tournament \"October Elites\".','tournament',0,'tournament',54,'2025-09-29 07:23:58','2025-09-29 07:23:58'),(121,10,'New Participant','User user4 has joined your tournament \"October Elites\".','tournament',0,'tournament',54,'2025-09-29 07:25:34','2025-09-29 07:25:34'),(122,11,'Tournament Joined','You have successfully joined the tournament \"October Elites\".','tournament',1,'tournament',54,'2025-09-29 07:25:34','2025-09-30 13:09:59'),(123,10,'New Participant','User edisona has joined your tournament \"October Elites\".','tournament',0,'tournament',54,'2025-09-29 07:26:36','2025-09-29 07:26:36'),(124,7,'Tournament Joined','You have successfully joined the tournament \"October Elites\".','tournament',0,'tournament',54,'2025-09-29 07:26:36','2025-09-29 07:26:36'),(125,10,'New Participant','User Matrix has joined your tournament \"October Elites\".','tournament',0,'tournament',54,'2025-09-29 07:28:16','2025-09-29 07:28:16'),(126,6,'Tournament Joined','You have successfully joined the tournament \"October Elites\".','tournament',0,'tournament',54,'2025-09-29 07:28:16','2025-09-29 07:28:16'),(127,10,'Tournament Created','You\'ve successfully created and joined the tournament \"kings\".','tournament',0,'tournament',55,'2025-09-29 13:47:12','2025-09-29 13:47:12'),(128,10,'New Participant','User edisona has joined your tournament \"kings\".','tournament',0,'tournament',55,'2025-09-29 13:48:03','2025-09-29 13:48:03'),(129,7,'Tournament Joined','You have successfully joined the tournament \"kings\".','tournament',0,'tournament',55,'2025-09-29 13:48:03','2025-09-29 13:48:03'),(130,10,'New Participant','User Matrix has joined your tournament \"kings\".','tournament',0,'tournament',55,'2025-09-29 13:48:49','2025-09-29 13:48:49'),(131,6,'Tournament Joined','You have successfully joined the tournament \"kings\".','tournament',0,'tournament',55,'2025-09-29 13:48:49','2025-09-29 13:48:49'),(132,6,'Tournament Starting','The tournament \"kings\" is now full and live. The bracket has been generated.','tournament',0,'tournament',55,'2025-09-29 13:49:48','2025-09-29 13:49:48'),(133,7,'Tournament Starting','The tournament \"kings\" is now full and live. The bracket has been generated.','tournament',0,'tournament',55,'2025-09-29 13:49:51','2025-09-29 13:49:51'),(134,10,'Tournament Starting','The tournament \"kings\" is now full and live. The bracket has been generated.','tournament',0,'tournament',55,'2025-09-29 13:49:54','2025-09-29 13:49:54'),(135,11,'Tournament Starting','The tournament \"kings\" is now full and live. The bracket has been generated.','tournament',1,'tournament',55,'2025-09-29 13:49:58','2025-09-30 13:09:59'),(136,10,'New Participant','User user4 has joined your tournament \"kings\".','tournament',0,'tournament',55,'2025-09-29 13:50:01','2025-09-29 13:50:01'),(137,11,'Tournament Joined','You have successfully joined the tournament \"kings\".','tournament',1,'tournament',55,'2025-09-29 13:50:01','2025-09-30 13:09:59'),(138,6,'Tournament Started','Tournament \"Princehope tech challenge\" has started! Check your bracket.','tournament',0,'tournament',51,'2025-09-29 14:01:46','2025-09-29 14:01:46'),(139,9,'Tournament Started','Tournament \"Princehope tech challenge\" has started! Check your bracket.','tournament',0,'tournament',51,'2025-09-29 14:01:46','2025-09-29 14:01:46'),(140,10,'Tournament Started','Tournament \"Princehope tech challenge\" has started! Check your bracket.','tournament',0,'tournament',51,'2025-09-29 14:01:46','2025-09-29 14:01:46'),(141,11,'Tournament Started','Tournament \"Princehope tech challenge\" has started! Check your bracket.','tournament',1,'tournament',51,'2025-09-29 14:01:46','2025-09-30 13:09:59'),(142,11,'Tournament Created','You\'ve successfully created and joined the tournament \"Tanzania Cup\".','tournament',1,'tournament',56,'2025-09-30 12:05:39','2025-09-30 13:09:59'),(143,11,'Tournament Cancelled','The tournament \"Tanzania Cup\" has been cancelled by the creator. Your entry fee of 3 has been refunded.','tournament',0,'tournament',56,'2025-09-30 14:31:19','2025-09-30 14:31:19'),(144,11,'Tournament Created','You\'ve successfully created and joined the tournament \"Tanzania Cup\".','tournament',0,'tournament',57,'2025-10-01 07:12:39','2025-10-01 07:12:39'),(145,11,'Tournament Cancelled','The tournament \"Tanzania Cup\" has been cancelled by the creator. Your entry fee of 2 has been refunded.','tournament',0,'tournament',57,'2025-10-01 07:13:05','2025-10-01 07:13:05'),(146,11,'Tournament Created','You\'ve successfully created and joined the tournament \"Tanzania Cup\".','tournament',0,'tournament',58,'2025-10-01 07:51:58','2025-10-01 07:51:58'),(147,11,'Tournament Cancelled','The tournament \"Tanzania Cup\" has been cancelled by the creator. Your entry fee of 2 has been refunded.','tournament',0,'tournament',58,'2025-10-01 07:52:42','2025-10-01 07:52:42'),(148,1,'New Participant','User user4 has joined your tournament \"eFootball Android Cup\".','tournament',0,'tournament',5,'2025-10-01 09:55:34','2025-10-01 09:55:34'),(149,11,'Tournament Joined','You have successfully joined the tournament \"eFootball Android Cup\".','tournament',0,'tournament',5,'2025-10-01 09:55:34','2025-10-01 09:55:34');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_methods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `logo_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fee_structure` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `requires_redirect` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_methods`
--

LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_records`
--

DROP TABLE IF EXISTS `payment_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` int NOT NULL,
  `clickpesa_payment_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkout_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'TZS',
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `gateway_response` json DEFAULT NULL,
  `webhook_data` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clickpesa_payment_id` (`clickpesa_payment_id`),
  KEY `transaction_id` (`transaction_id`),
  CONSTRAINT `payment_records_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_records`
--

LOCK TABLES `payment_records` WRITE;
/*!40000 ALTER TABLE `payment_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platforms`
--

DROP TABLE IF EXISTS `platforms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `platforms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platforms`
--

LOCK TABLES `platforms` WRITE;
/*!40000 ALTER TABLE `platforms` DISABLE KEYS */;
INSERT INTO `platforms` VALUES (1,'Android',NULL,'active','2025-09-15 15:00:12','2025-09-15 15:00:12'),(2,'iOS',NULL,'active','2025-09-15 15:00:12','2025-09-15 15:00:12');
/*!40000 ALTER TABLE `platforms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_participants`
--

DROP TABLE IF EXISTS `tournament_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `user_id` int NOT NULL,
  `gamer_tag` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `final_standing` int DEFAULT NULL,
  `checked_in` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_participation` (`tournament_id`,`user_id`),
  KEY `idx_participants_tournament_id` (`tournament_id`),
  KEY `idx_participants_user_id` (`user_id`),
  CONSTRAINT `tournament_participants_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tournament_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=88 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_participants`
--

LOCK TABLES `tournament_participants` WRITE;
/*!40000 ALTER TABLE `tournament_participants` DISABLE KEYS */;
INSERT INTO `tournament_participants` VALUES (1,5,1,'testuser',NULL,0,'2025-09-16 04:36:29','2025-09-16 04:36:29'),(2,6,2,'PlayerOne',NULL,0,'2025-09-16 09:50:29','2025-09-16 09:50:29'),(3,6,3,'PlayerTwo',NULL,0,'2025-09-16 09:50:29','2025-09-16 09:50:29'),(4,6,5,'PlayerThree',NULL,0,'2025-09-16 09:50:29','2025-09-16 09:50:29'),(5,6,4,'PlayerFour',NULL,0,'2025-09-16 09:50:29','2025-09-16 09:50:29'),(8,17,7,'Parkstone',NULL,0,'2025-09-18 18:35:48','2025-09-18 18:35:48'),(9,17,6,'Tumaini',NULL,0,'2025-09-18 18:37:40','2025-09-18 18:37:40'),(10,19,7,'Matrix',NULL,0,'2025-09-20 07:58:27','2025-09-20 07:58:27'),(15,19,6,'Jack',NULL,0,'2025-09-20 08:30:32','2025-09-20 08:30:32'),(16,20,6,'player1',NULL,0,'2025-09-20 08:51:40','2025-09-20 08:51:40'),(17,20,7,'player2',NULL,0,'2025-09-20 08:52:48','2025-09-20 08:52:48'),(18,21,7,'1_player',NULL,0,'2025-09-20 09:13:28','2025-09-20 09:13:28'),(19,21,6,'2_player',NULL,0,'2025-09-20 09:15:34','2025-09-20 09:15:34'),(20,22,6,'1-player',NULL,0,'2025-09-20 09:22:22','2025-09-20 09:22:22'),(21,23,6,'1-player',NULL,0,'2025-09-20 09:27:28','2025-09-20 09:27:28'),(22,24,6,'1-player',NULL,0,'2025-09-20 09:34:48','2025-09-20 09:34:48'),(23,24,7,'2-player',NULL,0,'2025-09-20 09:36:21','2025-09-20 09:36:21'),(24,25,7,'1-player',NULL,0,'2025-09-20 09:59:57','2025-09-20 09:59:57'),(25,25,6,'ParkstoneGen',NULL,0,'2025-09-20 10:01:32','2025-09-20 10:01:32'),(26,26,7,'ParkstoneGen',NULL,0,'2025-09-20 10:22:49','2025-09-20 10:22:49'),(27,26,6,'1-player',NULL,0,'2025-09-20 10:23:51','2025-09-20 10:23:51'),(28,27,7,'1-player Stronger',NULL,0,'2025-09-20 10:38:01','2025-09-20 10:38:01'),(29,27,6,'Tumaini',NULL,0,'2025-09-20 10:38:53','2025-09-20 10:38:53'),(33,34,7,'edisona',NULL,0,'2025-09-21 10:35:19','2025-09-21 10:35:19'),(34,34,6,'Matrix',NULL,0,'2025-09-21 10:36:21','2025-09-21 10:36:21'),(35,35,6,'Matrix',NULL,0,'2025-09-21 11:10:32','2025-09-21 11:10:32'),(36,35,7,'1-player',NULL,0,'2025-09-21 11:11:30','2025-09-21 11:11:30'),(37,36,7,'edisona',NULL,0,'2025-09-21 11:24:21','2025-09-21 11:24:21'),(38,36,6,'Matrix',1,0,'2025-09-21 11:25:05','2025-09-21 11:49:52'),(39,37,6,'MatrixGen',NULL,0,'2025-09-21 11:58:05','2025-09-21 11:58:05'),(40,37,7,'Jack',1,0,'2025-09-21 11:59:19','2025-09-21 12:19:15'),(41,38,7,'King Jimmy',NULL,0,'2025-09-21 12:22:51','2025-09-21 12:22:51'),(42,38,6,'King hillary',NULL,0,'2025-09-21 12:24:01','2025-09-21 12:24:01'),(43,39,6,'Matrix Killer',NULL,0,'2025-09-21 12:36:31','2025-09-21 12:36:31'),(44,39,7,'ParkstoneGen',NULL,1,'2025-09-21 12:38:07','2025-09-21 12:38:07'),(45,40,7,'edisona',NULL,0,'2025-09-21 12:47:59','2025-09-21 12:47:59'),(46,40,6,'1-player',1,1,'2025-09-21 12:48:46','2025-09-21 15:46:28'),(47,41,6,'Matrix90',NULL,0,'2025-09-21 12:54:24','2025-09-21 12:54:24'),(48,41,7,'1-player',NULL,0,'2025-09-21 12:55:41','2025-09-21 12:55:41'),(49,42,7,'Ultimate',NULL,0,'2025-09-21 16:11:38','2025-09-21 16:11:38'),(50,42,6,'Eliana',NULL,0,'2025-09-21 16:14:47','2025-09-21 16:14:47'),(51,43,6,'Matrix',1,0,'2025-09-21 16:29:59','2025-09-21 16:51:06'),(52,43,7,'1-player',NULL,0,'2025-09-21 16:31:18','2025-09-21 16:31:18'),(53,44,6,'Matrix',NULL,0,'2025-09-21 16:53:11','2025-09-21 16:53:11'),(54,44,7,'ParkstoneGen',NULL,1,'2025-09-21 16:54:44','2025-09-21 16:54:44'),(55,45,7,'Genius',NULL,0,'2025-09-21 17:16:26','2025-09-21 17:16:26'),(56,45,6,'Tumaini',NULL,1,'2025-09-21 17:17:13','2025-09-21 17:17:13'),(58,47,7,'Dagama',NULL,0,'2025-09-21 19:40:22','2025-09-21 19:40:22'),(59,47,6,'ParkstoneGen',NULL,1,'2025-09-21 19:41:45','2025-09-21 19:41:45'),(60,48,6,'Matrix',NULL,0,'2025-09-23 13:41:31','2025-09-23 13:41:31'),(61,48,7,'ParkstoneGen',NULL,1,'2025-09-23 13:42:56','2025-09-23 13:42:56'),(62,49,6,'Matrix',1,0,'2025-09-23 20:32:15','2025-09-24 12:19:10'),(63,49,7,'Parkstone',NULL,1,'2025-09-23 20:33:16','2025-09-23 20:33:16'),(64,50,9,'user3',NULL,0,'2025-09-26 09:46:00','2025-09-26 09:46:00'),(65,50,6,'Matrix',NULL,1,'2025-09-26 10:04:55','2025-09-26 10:04:55'),(66,50,10,'User1',NULL,1,'2025-09-26 10:06:11','2025-09-26 10:06:11'),(67,50,11,'User4',NULL,1,'2025-09-26 10:08:01','2025-09-26 10:08:01'),(68,51,11,'user4',NULL,0,'2025-09-26 10:14:37','2025-09-26 10:14:37'),(69,51,6,'Matrix',NULL,1,'2025-09-26 10:15:39','2025-09-26 10:15:39'),(70,51,9,'User4',NULL,1,'2025-09-26 10:21:10','2025-09-26 10:21:10'),(73,51,10,'User1',NULL,1,'2025-09-26 12:17:56','2025-09-26 12:17:56'),(74,53,9,'user3',NULL,0,'2025-09-26 13:27:12','2025-09-26 13:27:12'),(75,53,11,'User4',NULL,1,'2025-09-26 13:27:42','2025-09-26 13:27:42'),(76,54,10,'user1',NULL,0,'2025-09-29 07:23:58','2025-09-29 07:23:58'),(77,54,11,'user4',NULL,1,'2025-09-29 07:25:34','2025-09-29 07:25:34'),(78,54,7,'Edisona',NULL,1,'2025-09-29 07:26:36','2025-09-29 07:26:36'),(79,54,6,'Matrix',NULL,1,'2025-09-29 07:28:16','2025-09-29 07:28:16'),(80,55,10,'user1',NULL,0,'2025-09-29 13:47:12','2025-09-29 13:47:12'),(81,55,7,'Parkstone',NULL,1,'2025-09-29 13:48:03','2025-09-29 13:48:03'),(82,55,6,'Matrix',NULL,1,'2025-09-29 13:48:49','2025-09-29 13:48:49'),(83,55,11,'user4',NULL,1,'2025-09-29 13:49:48','2025-09-29 13:49:48'),(87,5,11,'Matrix',NULL,1,'2025-10-01 09:55:34','2025-10-01 09:55:34');
/*!40000 ALTER TABLE `tournament_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_prizes`
--

DROP TABLE IF EXISTS `tournament_prizes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_prizes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `position` int NOT NULL,
  `percentage` decimal(5,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_prize` (`tournament_id`,`position`),
  KEY `idx_prizes_tournament_id` (`tournament_id`),
  CONSTRAINT `tournament_prizes_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_prizes`
--

LOCK TABLES `tournament_prizes` WRITE;
/*!40000 ALTER TABLE `tournament_prizes` DISABLE KEYS */;
INSERT INTO `tournament_prizes` VALUES (1,1,1,60.00),(2,1,2,40.00),(3,2,1,60.00),(4,2,2,40.00),(5,3,1,60.00),(6,3,2,40.00),(7,4,1,60.00),(8,4,2,40.00),(9,5,1,60.00),(10,5,2,40.00),(26,17,1,100.00),(28,19,1,100.00),(29,20,1,100.00),(30,21,1,100.00),(31,22,1,100.00),(33,24,1,100.00),(34,25,1,100.00),(35,26,1,100.00),(36,27,1,100.00),(37,23,1,100.00),(44,34,1,100.00),(45,35,1,100.00),(46,36,1,100.00),(47,37,1,100.00),(48,38,1,100.00),(49,39,1,100.00),(50,40,1,90.00),(51,40,2,10.00),(52,41,1,100.00),(54,42,1,70.00),(55,42,2,30.00),(56,43,1,100.00),(57,44,1,100.00),(58,45,1,100.00),(60,47,1,100.00),(61,48,1,90.00),(62,48,2,10.00),(63,49,1,100.00),(64,50,1,100.00),(65,51,1,100.00),(67,53,1,100.00),(68,54,1,100.00),(69,55,1,100.00);
/*!40000 ALTER TABLE `tournament_prizes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournaments`
--

DROP TABLE IF EXISTS `tournaments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournaments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `game_id` int NOT NULL,
  `platform_id` int NOT NULL,
  `game_mode_id` int NOT NULL,
  `format` enum('single_elimination','double_elimination','round_robin') COLLATE utf8mb4_unicode_ci DEFAULT 'single_elimination',
  `entry_fee` decimal(10,2) NOT NULL,
  `total_slots` int NOT NULL,
  `current_slots` int DEFAULT '0',
  `status` enum('open','locked','live','upcoming','ongoing','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL,
  `visibility` enum('public','private') COLLATE utf8mb4_unicode_ci DEFAULT 'public',
  `rules` text COLLATE utf8mb4_unicode_ci,
  `created_by` int NOT NULL,
  `start_time` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tournaments_game_id` (`game_id`),
  KEY `idx_tournaments_status` (`status`),
  KEY `idx_tournaments_platform` (`platform_id`),
  KEY `idx_tournaments_game_mode` (`game_mode_id`),
  KEY `tournaments_game_id` (`game_id`),
  KEY `tournaments_platform_id` (`platform_id`),
  KEY `tournaments_game_mode_id` (`game_mode_id`),
  KEY `tournaments_status` (`status`),
  KEY `tournaments_created_by` (`created_by`),
  CONSTRAINT `tournaments_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`),
  CONSTRAINT `tournaments_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `tournaments_ibfk_3` FOREIGN KEY (`platform_id`) REFERENCES `platforms` (`id`),
  CONSTRAINT `tournaments_ibfk_4` FOREIGN KEY (`game_mode_id`) REFERENCES `game_modes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournaments`
--

LOCK TABLES `tournaments` WRITE;
/*!40000 ALTER TABLE `tournaments` DISABLE KEYS */;
INSERT INTO `tournaments` VALUES (1,'eFootball Android Cup',1,1,2,'single_elimination',5.00,8,0,'open','public',NULL,1,'2025-09-16 15:00:00','2025-09-15 19:16:12','2025-09-15 19:16:12'),(2,'eFootball Android Cup',1,1,2,'single_elimination',5.00,8,0,'open','public',NULL,1,'2025-09-17 15:00:00','2025-09-15 19:17:42','2025-09-15 19:17:42'),(3,'eFootball Android Cup',1,1,2,'single_elimination',6.00,8,0,'open','public',NULL,1,'2025-09-17 15:00:00','2025-09-15 19:22:39','2025-09-15 19:22:39'),(4,'eFootball Android Cup',1,1,2,'single_elimination',6.00,8,0,'open','public',NULL,1,'2025-09-17 15:00:00','2025-09-15 19:28:12','2025-09-15 19:28:12'),(5,'eFootball Android Cup',1,1,2,'single_elimination',6.00,8,2,'open','public',NULL,1,'2025-09-17 15:00:00','2025-09-15 19:47:01','2025-10-01 09:55:34'),(6,'Test Tournament',1,1,1,'single_elimination',10.00,4,4,'locked','public',NULL,2,'2025-09-23 09:50:29','2025-09-16 09:50:29','2025-09-16 09:50:29'),(17,'Tanzania Cup',2,1,3,'single_elimination',1.00,2,2,'completed','public',NULL,7,'2025-09-23 18:26:00','2025-09-18 18:27:46','2025-09-20 17:55:56'),(19,'Diamond Cup',2,1,3,'single_elimination',1.00,2,2,'completed','public','No cheating',7,'2025-09-21 07:00:00','2025-09-20 07:58:04','2025-09-20 17:58:07'),(20,'test tournament',3,1,5,'double_elimination',2.00,2,2,'live','public','no cheating',6,'2025-09-27 08:50:00','2025-09-20 08:51:13','2025-09-20 09:16:23'),(21,'New yearTournament',2,1,3,'single_elimination',2.00,2,2,'locked','public','new year tournament',7,'2025-10-04 09:12:00','2025-09-20 09:12:58','2025-09-20 09:15:34'),(22,'20-sept Tournament',1,1,1,'single_elimination',1.88,4,1,'open','public',NULL,6,'2025-09-20 09:25:00','2025-09-20 09:21:41','2025-09-20 09:22:22'),(23,'testing1 tournament',1,1,1,'single_elimination',0.50,2,1,'open','public','',6,'2025-09-21 06:30:00','2025-09-20 09:27:02','2025-09-20 14:11:03'),(24,'Supercup',1,1,1,'single_elimination',9.86,2,2,'locked','public',NULL,6,'2025-09-20 09:40:00','2025-09-20 09:34:32','2025-09-20 09:36:21'),(25,'18sept Tournament',1,2,1,'single_elimination',1.00,2,2,'completed','public',NULL,7,'2025-09-20 10:05:00','2025-09-20 09:59:40','2025-09-20 17:56:13'),(26,'Tanzania Cup',1,1,1,'single_elimination',1.00,2,2,'completed','public',NULL,7,'2025-09-20 10:30:00','2025-09-20 10:22:13','2025-09-20 17:51:23'),(27,'20 -sept challenge',2,1,3,'single_elimination',2.00,2,2,'completed','public',NULL,7,'2025-09-20 10:42:00','2025-09-20 10:37:25','2025-09-20 17:51:01'),(34,'Sunday Cup',1,1,2,'round_robin',5.00,2,2,'locked','public',NULL,7,'2025-09-21 10:41:00','2025-09-21 10:35:19','2025-09-21 10:36:21'),(35,'Tanzania Cup',2,1,3,'single_elimination',7.00,2,2,'locked','public',NULL,6,'2025-09-26 11:10:00','2025-09-21 11:10:32','2025-09-21 11:11:30'),(36,'Sunday FIFA',2,1,3,'round_robin',1.00,2,2,'completed','public',NULL,7,'2025-09-23 11:24:00','2025-09-21 11:24:21','2025-09-21 11:49:52'),(37,'Tanzania Cup',1,1,1,'round_robin',20.00,2,2,'completed','public',NULL,6,'2025-09-22 11:57:00','2025-09-21 11:58:05','2025-09-21 12:19:15'),(38,'Wallet pumper',3,1,4,'single_elimination',30.00,2,2,'live','public',NULL,7,'2025-09-23 12:22:00','2025-09-21 12:22:51','2025-09-21 12:24:01'),(39,'Wallet checker',1,1,1,'single_elimination',20.00,2,2,'locked','public',NULL,6,'2025-09-25 12:36:00','2025-09-21 12:36:31','2025-09-21 12:38:07'),(40,'Tanzania Cup',2,1,3,'single_elimination',10.00,2,2,'completed','public',NULL,7,'2025-09-22 12:47:00','2025-09-21 12:47:59','2025-09-21 15:46:28'),(41,'18sept Tournament',2,1,3,'single_elimination',10.00,2,2,'live','public',NULL,6,'2025-09-23 12:54:00','2025-09-21 12:54:24','2025-09-21 12:55:41'),(42,'Iphone competition',1,1,1,'single_elimination',5.00,2,2,'live','public','',7,'2025-09-23 13:11:00','2025-09-21 16:11:38','2025-09-21 16:14:47'),(43,'18sept Tournament',1,1,1,'single_elimination',11.87,2,2,'completed','public',NULL,6,'2025-09-26 16:29:00','2025-09-21 16:29:59','2025-09-21 16:51:06'),(44,'Tanzania Cup',1,1,1,'single_elimination',12.00,2,2,'completed','public',NULL,6,'2025-09-22 16:52:00','2025-09-21 16:53:11','2025-09-23 18:46:33'),(45,'19 SEPT',1,1,1,'single_elimination',10.00,2,2,'live','public',NULL,7,'2025-09-25 17:16:00','2025-09-21 17:16:26','2025-09-21 17:17:13'),(47,'Emailer Tournament',2,1,3,'single_elimination',1.00,2,2,'live','public','Play to the death',7,'2025-09-21 20:39:00','2025-09-21 19:40:22','2025-09-21 19:41:45'),(48,'18sept Tournament',1,1,1,'single_elimination',1.00,2,2,'completed','public',NULL,6,'2025-09-24 13:40:00','2025-09-23 13:41:31','2025-09-23 18:45:56'),(49,'18sept Tournament',1,1,1,'single_elimination',2.00,2,2,'completed','public',NULL,6,'2025-09-24 20:32:00','2025-09-23 20:32:15','2025-09-24 12:19:10'),(50,'De princehope',2,1,3,'single_elimination',2.00,4,4,'live','public',NULL,9,'2025-09-26 21:45:00','2025-09-26 09:45:59','2025-09-26 10:08:01'),(51,'Princehope tech challenge',2,1,3,'double_elimination',2.00,4,4,'live','public',NULL,11,'2025-09-27 10:14:00','2025-09-26 10:14:37','2025-09-29 14:01:46'),(53,'De princehope',2,1,3,'single_elimination',2.00,2,2,'live','public',NULL,9,'2025-09-28 13:27:00','2025-09-26 13:27:12','2025-09-26 13:27:42'),(54,'October Elites',2,1,3,'double_elimination',2.00,4,4,'live','public',NULL,10,'2025-10-29 07:23:00','2025-09-29 07:23:58','2025-09-29 12:28:46'),(55,'kings',1,1,1,'round_robin',2.00,4,4,'live','public',NULL,10,'2025-10-30 13:46:00','2025-09-29 13:47:12','2025-09-29 13:49:48');
/*!40000 ALTER TABLE `tournaments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` enum('deposit','withdrawal','tournament_entry','prize_won','refund') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `balance_before` decimal(10,2) NOT NULL,
  `balance_after` decimal(10,2) NOT NULL,
  `status` enum('pending','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `pesapal_transaction_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transaction_reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'TZS',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `payment_reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_type` enum('clickpesa','internal') COLLATE utf8mb4_unicode_ci DEFAULT 'internal',
  `gateway_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_reference` (`transaction_reference`),
  KEY `idx_transactions_user_created` (`user_id`,`created_at`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (1,7,'tournament_entry',2.00,98.00,98.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Night Stand','2025-09-20 18:59:24','2025-09-20 18:59:24',NULL,'internal',NULL,NULL),(2,7,'tournament_entry',8.00,90.00,90.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: refund test','2025-09-20 19:02:42','2025-09-20 19:02:42',NULL,'internal',NULL,NULL),(3,7,'tournament_entry',10.00,80.00,80.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: test refund','2025-09-20 19:14:00','2025-09-20 19:14:00',NULL,'internal',NULL,NULL),(5,7,'refund',10.00,80.00,90.00,'completed',NULL,NULL,'TZS','Refund for deleted tournament: test refund','2025-09-20 19:26:51','2025-09-20 19:26:51',NULL,'internal',NULL,NULL),(6,7,'tournament_entry',5.00,85.00,85.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Sunday Cup','2025-09-21 10:35:19','2025-09-21 10:35:19',NULL,'internal',NULL,NULL),(7,6,'tournament_entry',7.00,93.00,93.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Tanzania Cup','2025-09-21 11:10:32','2025-09-21 11:10:32',NULL,'internal',NULL,NULL),(8,7,'tournament_entry',1.00,84.00,84.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Sunday FIFA','2025-09-21 11:24:21','2025-09-21 11:24:21',NULL,'internal',NULL,NULL),(9,6,'prize_won',2.00,93.00,93.00,'completed',NULL,NULL,'TZS','Prize for finishing 1 place in tournament: Sunday FIFA','2025-09-21 11:49:52','2025-09-21 11:49:52',NULL,'internal',NULL,NULL),(10,6,'tournament_entry',20.00,73.00,73.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Tanzania Cup','2025-09-21 11:58:05','2025-09-21 11:58:05',NULL,'internal',NULL,NULL),(13,7,'prize_won',40.00,84.00,124.00,'completed',NULL,NULL,'TZS','Prize for finishing 1st place in tournament: Tanzania Cup','2025-09-21 12:19:15','2025-09-21 12:19:15',NULL,'internal',NULL,NULL),(14,7,'tournament_entry',30.00,94.00,94.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Wallet pumper','2025-09-21 12:22:51','2025-09-21 12:22:51',NULL,'internal',NULL,NULL),(15,6,'tournament_entry',20.00,53.00,53.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Wallet checker','2025-09-21 12:36:31','2025-09-21 12:36:31',NULL,'internal',NULL,NULL),(16,7,'tournament_entry',10.00,84.00,84.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Tanzania Cup','2025-09-21 12:47:59','2025-09-21 12:47:59',NULL,'internal',NULL,NULL),(17,6,'tournament_entry',10.00,43.00,43.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Tanzania Cup','2025-09-21 12:48:46','2025-09-21 12:48:46',NULL,'internal',NULL,NULL),(18,6,'tournament_entry',10.00,33.00,33.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: 18sept Tournament','2025-09-21 12:54:24','2025-09-21 12:54:24',NULL,'internal',NULL,NULL),(19,7,'tournament_entry',10.00,74.00,74.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: 18sept Tournament','2025-09-21 12:55:41','2025-09-21 12:55:41',NULL,'internal',NULL,NULL),(20,6,'prize_won',18.00,33.00,51.00,'completed',NULL,NULL,'TZS','Prize for finishing 1st place in tournament: Tanzania Cup','2025-09-21 15:46:28','2025-09-21 15:46:28',NULL,'internal',NULL,NULL),(21,7,'tournament_entry',5.00,69.00,69.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Iphone competition','2025-09-21 16:11:38','2025-09-21 16:11:38',NULL,'internal',NULL,NULL),(22,6,'tournament_entry',5.00,46.00,46.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Iphone competition','2025-09-21 16:14:47','2025-09-21 16:14:47',NULL,'internal',NULL,NULL),(23,6,'tournament_entry',11.87,34.13,34.13,'completed',NULL,NULL,'TZS','Entry fee for tournament: 18sept Tournament','2025-09-21 16:29:59','2025-09-21 16:29:59',NULL,'internal',NULL,NULL),(24,7,'tournament_entry',11.87,57.13,57.13,'completed',NULL,NULL,'TZS','Entry fee for tournament: 18sept Tournament','2025-09-21 16:31:18','2025-09-21 16:31:18',NULL,'internal',NULL,NULL),(25,6,'prize_won',23.74,34.13,57.87,'completed',NULL,NULL,'TZS','Prize for finishing 1st place in tournament: 18sept Tournament','2025-09-21 16:51:06','2025-09-21 16:51:06',NULL,'internal',NULL,NULL),(26,6,'tournament_entry',12.00,45.87,45.87,'completed',NULL,NULL,'TZS','Entry fee for tournament: Tanzania Cup','2025-09-21 16:53:11','2025-09-21 16:53:11',NULL,'internal',NULL,NULL),(27,7,'tournament_entry',12.00,45.13,45.13,'completed',NULL,NULL,'TZS','Entry fee for tournament: Tanzania Cup','2025-09-21 16:54:44','2025-09-21 16:54:44',NULL,'internal',NULL,NULL),(28,7,'tournament_entry',10.00,35.13,35.13,'completed',NULL,NULL,'TZS','Entry fee for tournament: 19 SEPT','2025-09-21 17:16:26','2025-09-21 17:16:26',NULL,'internal',NULL,NULL),(29,6,'tournament_entry',10.00,35.87,35.87,'completed',NULL,NULL,'TZS','Entry fee for tournament: 19 SEPT','2025-09-21 17:17:13','2025-09-21 17:17:13',NULL,'internal',NULL,NULL),(30,6,'tournament_entry',1.00,34.87,34.87,'completed',NULL,NULL,'TZS','Entry fee for tournament: 18sept Tournament','2025-09-21 19:23:54','2025-09-21 19:23:54',NULL,'internal',NULL,NULL),(31,6,'refund',1.00,34.87,35.87,'completed',NULL,NULL,'TZS','Refund for deleted tournament: 18sept Tournament','2025-09-21 19:24:35','2025-09-21 19:24:35',NULL,'internal',NULL,NULL),(32,7,'tournament_entry',1.00,34.13,34.13,'completed',NULL,NULL,'TZS','Entry fee for tournament: Emailer Tournament','2025-09-21 19:40:22','2025-09-21 19:40:22',NULL,'internal',NULL,NULL),(33,6,'tournament_entry',1.00,34.87,34.87,'completed',NULL,NULL,'TZS','Entry fee for tournament: Emailer Tournament','2025-09-21 19:41:45','2025-09-21 19:41:45',NULL,'internal',NULL,NULL),(34,6,'tournament_entry',1.00,33.87,33.87,'completed',NULL,NULL,'TZS','Entry fee for tournament: 18sept Tournament','2025-09-23 13:41:31','2025-09-23 13:41:31',NULL,'internal',NULL,NULL),(35,7,'tournament_entry',1.00,33.13,33.13,'completed',NULL,NULL,'TZS','Entry fee for tournament: 18sept Tournament','2025-09-23 13:42:56','2025-09-23 13:42:56',NULL,'internal',NULL,NULL),(36,6,'tournament_entry',2.00,31.87,31.87,'completed',NULL,NULL,'TZS','Entry fee for tournament: 18sept Tournament','2025-09-23 20:32:15','2025-09-23 20:32:15',NULL,'internal',NULL,NULL),(37,7,'tournament_entry',2.00,31.13,31.13,'completed',NULL,NULL,'TZS','Entry fee for tournament: 18sept Tournament','2025-09-23 20:33:16','2025-09-23 20:33:16',NULL,'internal',NULL,NULL),(38,6,'prize_won',4.00,31.87,35.87,'completed',NULL,NULL,'TZS','Prize for finishing 1st place in tournament: 18sept Tournament','2025-09-24 12:19:10','2025-09-24 12:19:10',NULL,'internal',NULL,NULL),(39,9,'tournament_entry',2.00,98.00,98.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: De princehope','2025-09-26 09:46:00','2025-09-26 09:46:00',NULL,'internal',NULL,NULL),(40,6,'tournament_entry',2.00,100.00,98.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: De princehope','2025-09-26 10:04:55','2025-09-26 10:04:55',NULL,'internal',NULL,NULL),(41,10,'tournament_entry',2.00,100.00,98.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: De princehope','2025-09-26 10:06:11','2025-09-26 10:06:11',NULL,'internal',NULL,NULL),(42,11,'tournament_entry',2.00,100.00,98.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: De princehope','2025-09-26 10:08:01','2025-09-26 10:08:01',NULL,'internal',NULL,NULL),(43,11,'tournament_entry',2.00,96.00,96.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Princehope tech challenge','2025-09-26 10:14:37','2025-09-26 10:14:37',NULL,'internal',NULL,NULL),(44,6,'tournament_entry',2.00,98.00,96.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Princehope tech challenge','2025-09-26 10:15:39','2025-09-26 10:15:39',NULL,'internal',NULL,NULL),(45,9,'tournament_entry',2.00,98.00,96.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Princehope tech challenge','2025-09-26 10:21:10','2025-09-26 10:21:10',NULL,'internal',NULL,NULL),(46,10,'tournament_entry',1.00,97.00,97.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: TUMAINI','2025-09-26 10:35:34','2025-09-26 10:35:34',NULL,'internal',NULL,NULL),(47,9,'tournament_entry',1.00,96.00,95.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: TUMAINI','2025-09-26 10:36:15','2025-09-26 10:36:15',NULL,'internal',NULL,NULL),(48,10,'tournament_entry',2.00,97.00,95.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Princehope tech challenge','2025-09-26 12:17:56','2025-09-26 12:17:56',NULL,'internal',NULL,NULL),(49,9,'tournament_entry',2.00,93.00,93.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: De princehope','2025-09-26 13:27:12','2025-09-26 13:27:12',NULL,'internal',NULL,NULL),(50,11,'tournament_entry',2.00,96.00,94.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: De princehope','2025-09-26 13:27:42','2025-09-26 13:27:42',NULL,'internal',NULL,NULL),(51,9,'refund',1.00,93.00,94.00,'completed',NULL,NULL,'TZS','Refund for deleted tournament: TUMAINI','2025-09-29 07:22:00','2025-09-29 07:22:00',NULL,'internal',NULL,NULL),(52,10,'refund',1.00,95.00,96.00,'completed',NULL,NULL,'TZS','Refund for deleted tournament: TUMAINI','2025-09-29 07:22:00','2025-09-29 07:22:00',NULL,'internal',NULL,NULL),(53,10,'tournament_entry',2.00,94.00,94.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: October Elites','2025-09-29 07:23:58','2025-09-29 07:23:58',NULL,'internal',NULL,NULL),(54,11,'tournament_entry',2.00,94.00,92.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: October Elites','2025-09-29 07:25:34','2025-09-29 07:25:34',NULL,'internal',NULL,NULL),(55,7,'tournament_entry',2.00,100.00,98.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: October Elites','2025-09-29 07:26:36','2025-09-29 07:26:36',NULL,'internal',NULL,NULL),(56,6,'tournament_entry',2.00,96.00,94.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: October Elites','2025-09-29 07:28:16','2025-09-29 07:28:16',NULL,'internal',NULL,NULL),(57,10,'tournament_entry',2.00,92.00,92.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: kings','2025-09-29 13:47:12','2025-09-29 13:47:12',NULL,'internal',NULL,NULL),(58,7,'tournament_entry',2.00,98.00,96.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: kings','2025-09-29 13:48:03','2025-09-29 13:48:03',NULL,'internal',NULL,NULL),(59,6,'tournament_entry',2.00,94.00,92.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: kings','2025-09-29 13:48:49','2025-09-29 13:48:49',NULL,'internal',NULL,NULL),(60,11,'tournament_entry',2.00,92.00,90.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: kings','2025-09-29 13:49:48','2025-09-29 13:49:48',NULL,'internal',NULL,NULL),(61,11,'tournament_entry',3.00,87.00,87.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Tanzania Cup','2025-09-30 12:05:39','2025-09-30 12:05:39',NULL,'internal',NULL,NULL),(62,11,'refund',3.00,87.00,90.00,'completed',NULL,NULL,'TZS','Refund for deleted tournament: Tanzania Cup','2025-09-30 14:31:19','2025-09-30 14:31:19',NULL,'internal',NULL,NULL),(63,11,'tournament_entry',2.00,88.00,88.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Tanzania Cup','2025-10-01 07:12:39','2025-10-01 07:12:39',NULL,'internal',NULL,NULL),(64,11,'refund',2.00,88.00,90.00,'completed',NULL,NULL,'TZS','Refund for deleted tournament: Tanzania Cup','2025-10-01 07:13:05','2025-10-01 07:13:05',NULL,'internal',NULL,NULL),(65,11,'tournament_entry',2.00,88.00,88.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: Tanzania Cup','2025-10-01 07:51:58','2025-10-01 07:51:58',NULL,'internal',NULL,NULL),(66,11,'refund',2.00,88.00,90.00,'completed',NULL,NULL,'TZS','Refund for deleted tournament: Tanzania Cup','2025-10-01 07:52:41','2025-10-01 07:52:41',NULL,'internal',NULL,NULL),(67,11,'tournament_entry',6.00,90.00,84.00,'completed',NULL,NULL,'TZS','Entry fee for tournament: eFootball Android Cup','2025-10-01 09:55:34','2025-10-01 09:55:34',NULL,'internal',NULL,NULL);
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wallet_balance` decimal(10,2) DEFAULT '0.00',
  `role` enum('user','admin') COLLATE utf8mb4_unicode_ci DEFAULT 'user',
  `is_verified` tinyint(1) DEFAULT '0',
  `is_banned` tinyint(1) DEFAULT '0',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `email_notifications` tinyint(1) DEFAULT '1',
  `push_notifications` tinyint(1) DEFAULT '1',
  `sms_notifications` tinyint(1) DEFAULT '0',
  `email_verified` tinyint(1) DEFAULT '0',
  `phone_verified` tinyint(1) DEFAULT '0',
  `verification_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_token_expires` datetime DEFAULT NULL,
  `reset_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL,
  `phone_verification_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_verification_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'testuser','test@example.com','$2b$12$/2xl0bN50zBpF5sEBOxG9e1zQtd8wk/Q5zpRW8BjziWfTa6pZhPSq','0712345678',100.00,'user',0,0,'2025-09-15 18:59:36','2025-09-15 13:33:29','2025-09-17 15:50:19',1,1,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL),(2,'player1','player1@test.com','$2b$12$EXAMPLEHASH',NULL,100.00,'user',0,0,NULL,'2025-09-16 09:50:28','2025-09-16 09:50:28',1,1,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL),(3,'player2','player2@test.com','$2b$12$EXAMPLEHASH',NULL,100.00,'user',0,0,NULL,'2025-09-16 09:50:28','2025-09-16 09:50:28',1,1,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL),(4,'player4','player4@test.com','$2b$12$EXAMPLEHASH',NULL,100.00,'user',0,0,NULL,'2025-09-16 09:50:28','2025-09-16 09:50:28',1,1,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL),(5,'player3','player3@test.com','$2b$12$EXAMPLEHASH',NULL,100.00,'user',0,0,NULL,'2025-09-16 09:50:29','2025-09-16 09:50:29',1,1,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL),(6,'Matrix','matrix25102005@gmail.com','$2b$12$86gn7HCJYPAmHNDRlj2YwuZVdt0tJrsohjwCrznWbMnauSgNoqTC.',NULL,92.00,'user',0,0,'2025-09-29 13:48:32','2025-09-17 12:35:03','2025-09-29 13:48:49',1,1,0,1,0,NULL,NULL,NULL,NULL,NULL,NULL),(7,'edisona','matrix25102004@gmail.com','$2b$12$VpJiHSdPlcabjMvkTQn1QO9jOL7AXmrq6RNO0h/hBXcVdRum7Hz1q',NULL,96.00,'user',0,0,'2025-09-29 13:47:43','2025-09-18 18:06:19','2025-09-29 13:48:03',1,1,0,0,0,'f6b7ddcc816fae52cb4698f7ba5e624b30866b2b715284a5767c19c88c0fd76f','2025-09-24 13:56:48',NULL,NULL,NULL,NULL),(8,'user2','user2@gmail.com','$2b$12$J4UDABh9hBazWTgDpLmvce/BrHyXaGP6uPOREuF.JfSFAf7sFph6m',NULL,100.00,'user',0,0,NULL,'2025-09-25 09:10:52','2025-09-26 09:40:33',1,1,0,0,0,'9b4514fea49b9dbb9752517a0988615adf36eb46a49dfc10e42883db0f79928b','2025-09-26 09:10:52',NULL,NULL,NULL,NULL),(9,'user3','user3@gmail.com','$2b$12$ePiBXAmFlAOE5XtHVtxLn.ckPLNWHhvmnoxI/QdzCVJrhBRLq5gAG',NULL,94.00,'user',0,0,'2025-09-26 12:19:08','2025-09-25 09:14:41','2025-09-29 07:22:00',1,1,0,0,0,'3958eb64c399115976d96dae4bc8713661ad619f436f0faf078d6775cc161856','2025-09-26 09:14:41',NULL,NULL,NULL,NULL),(10,'user1','user1@gmail.com','$2b$12$4/M5trIowVIO2csjI5u8Y.yL8JrAOptBOzv1Yos9OoU.SKPABkcWK',NULL,92.00,'user',0,0,'2025-09-29 12:06:35','2025-09-25 09:45:30','2025-09-29 13:47:12',1,1,0,0,0,'652edf03a6a9237adafcf5fd7661ccee49efcae34f4e78d2d4902a439590d602','2025-09-26 09:45:30',NULL,NULL,NULL,NULL),(11,'user4','user4@gmail.com','$2b$12$iEr5Aw0BsWLNnUhA8GcWBOuJnTKBIIoH3n0sTtKDPbH9QRAaKDdo2',NULL,84.00,'user',0,0,'2025-10-01 12:44:12','2025-09-25 10:13:37','2025-10-01 12:44:12',1,1,0,0,0,'32c7a2c3de135f18eadd6da5703ba06554205223dcc0c0f913aebd494dd0340b','2025-09-26 10:13:37',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhook_logs`
--

DROP TABLE IF EXISTS `webhook_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhook_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `webhook_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `received_at` datetime DEFAULT NULL,
  `raw_payload` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `webhook_id` (`webhook_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhook_logs`
--

LOCK TABLES `webhook_logs` WRITE;
/*!40000 ALTER TABLE `webhook_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhook_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'gamersaloon'
--

--
-- Dumping routines for database 'gamersaloon'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-01 17:24:14
