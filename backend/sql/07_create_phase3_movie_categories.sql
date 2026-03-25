CREATE TABLE IF NOT EXISTS `phase3_movie_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `movie_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT '0',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_phase3_movie_category` (`movie_id`, `category_name`),
  KEY `idx_phase3_movie_categories_movie` (`movie_id`, `sort_order`, `id`),
  KEY `idx_phase3_movie_categories_created_by` (`created_by`),
  CONSTRAINT `fk_phase3_movie_categories_movie`
    FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_phase3_movie_categories_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
