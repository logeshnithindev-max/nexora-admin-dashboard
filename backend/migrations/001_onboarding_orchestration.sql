-- Run directly against nexora_admin before starting the API:
-- mysql -h HOST -u USER -p nexora_admin < backend/migrations/001_onboarding_orchestration.sql

CREATE TABLE IF NOT EXISTS onboarding_jobs (
  id CHAR(36) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  client_id VARCHAR(50) NOT NULL,
  project_id VARCHAR(50) NOT NULL,
  status ENUM('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
  current_step VARCHAR(50) DEFAULT NULL,
  request_json JSON NOT NULL,
  result_json JSON DEFAULT NULL,
  error_code VARCHAR(80) DEFAULT NULL,
  error_message VARCHAR(500) DEFAULT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 1,
  requested_by VARCHAR(255) DEFAULT NULL,
  started_at TIMESTAMP NULL DEFAULT NULL,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_onboarding_idempotency (idempotency_key),
  KEY idx_onboarding_tenant (client_id, project_id),
  KEY idx_onboarding_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS onboarding_job_steps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id CHAR(36) NOT NULL,
  step_name VARCHAR(50) NOT NULL,
  status ENUM('pending','running','completed','failed','skipped') NOT NULL DEFAULT 'pending',
  error_message VARCHAR(500) DEFAULT NULL,
  started_at TIMESTAMP NULL DEFAULT NULL,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_onboarding_job_step (job_id, step_name),
  CONSTRAINT fk_onboarding_step_job FOREIGN KEY (job_id)
    REFERENCES onboarding_jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

