ALTER TABLE movies
  ADD COLUMN submitter_email VARCHAR(191) DEFAULT NULL AFTER submitted_by,
  ADD KEY idx_movies_submitter_email (submitter_email);
