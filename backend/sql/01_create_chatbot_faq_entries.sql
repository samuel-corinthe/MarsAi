CREATE TABLE IF NOT EXISTS chatbot_faq_entries (
  id INT(11) NOT NULL AUTO_INCREMENT,
  faq_key VARCHAR(64) NOT NULL,
  language VARCHAR(8) NOT NULL DEFAULT 'fr',
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  usage_count INT(11) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_chatbot_faq_key_lang (faq_key, language),
  KEY idx_chatbot_faq_lang_active (language, is_active),
  KEY idx_chatbot_faq_key_active (faq_key, is_active),
  KEY idx_chatbot_faq_usage (usage_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
