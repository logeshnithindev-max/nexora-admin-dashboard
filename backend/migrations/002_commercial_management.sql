-- Apply to the shared `nexora` database. Business/commercial data lives beside
-- master_clients and master_projects; nexora_admin remains limited to admin
-- identities and operational audit/onboarding jobs.

-- ALTER TABLE master_projects
--   ADD COLUMN IF NOT EXISTS category ENUM('growth','business') NOT NULL DEFAULT 'growth' AFTER name;
alter table master_projects add column category enum("business", "growth") default "growth";


CREATE TABLE IF NOT EXISTS provider_definitions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  event_schema JSON DEFAULT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_provider_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO provider_definitions (code,name,is_custom) VALUES
  ('salla','Salla',FALSE),('shopify','Shopify',FALSE),('zid','Zid',FALSE),('custom','Custom',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),is_custom=VALUES(is_custom);

CREATE TABLE IF NOT EXISTS project_provider_configs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id VARCHAR(50) NOT NULL,
  project_id VARCHAR(50) NOT NULL,
  provider_code VARCHAR(40) NOT NULL,
  custom_schema JSON DEFAULT NULL,
  status ENUM('pending','configured','failed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_project_provider (client_id,project_id),
  KEY idx_provider_code (provider_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subscription_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(60) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  base_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  billing_interval ENUM('weekly','monthly','quarterly','yearly','custom') NOT NULL DEFAULT 'monthly',
  interval_days SMALLINT UNSIGNED DEFAULT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_plan_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS plan_limits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_id BIGINT UNSIGNED NOT NULL,
  metric_code VARCHAR(80) NOT NULL,
  metric_name VARCHAR(120) NOT NULL,
  channel VARCHAR(40) NOT NULL DEFAULT 'global',
  included_quantity DECIMAL(20,4) DEFAULT NULL,
  overage_unit_size DECIMAL(20,4) DEFAULT NULL,
  overage_unit_price DECIMAL(14,4) DEFAULT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id), UNIQUE KEY uq_plan_metric (plan_id,metric_code,channel),
  CONSTRAINT fk_plan_limit_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS client_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id VARCHAR(50) NOT NULL,
  project_id VARCHAR(50) DEFAULT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  status ENUM('trial','active','paused','cancelled','expired') NOT NULL DEFAULT 'active',
  starts_on DATE NOT NULL,
  ends_on DATE DEFAULT NULL,
  trial_ends_on DATE DEFAULT NULL,
  custom_overrides JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_client_subscription (client_id,project_id,status),
  CONSTRAINT fk_client_subscription_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS resource_usage_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id VARCHAR(50) NOT NULL,
  project_id VARCHAR(50) DEFAULT NULL,
  metric_code VARCHAR(80) NOT NULL,
  channel VARCHAR(40) NOT NULL DEFAULT 'global',
  quantity DECIMAL(20,4) NOT NULL DEFAULT 0,
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  measured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_usage_client_period (client_id,period_start,period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_number VARCHAR(60) NOT NULL,
  client_id VARCHAR(50) NOT NULL,
  project_id VARCHAR(50) DEFAULT NULL,
  status ENUM('draft','approval_pending','approved','sent','partially_paid','paid','void','overdue') NOT NULL DEFAULT 'draft',
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount_type ENUM('none','fixed','percentage') NOT NULL DEFAULT 'none',
  discount_value DECIMAL(14,4) NOT NULL DEFAULT 0,
  discount_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  taxable_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
  tax_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  total DECIMAL(14,2) NOT NULL DEFAULT 0,
  due_on DATE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  sent_at DATETIME DEFAULT NULL,
  paid_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_invoice_number (invoice_number),
  KEY idx_invoice_client_status (client_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoice_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(300) NOT NULL,
  metric_code VARCHAR(80) DEFAULT NULL,
  channel VARCHAR(40) NOT NULL DEFAULT 'global',
  quantity DECIMAL(20,4) NOT NULL DEFAULT 1,
  unit_price DECIMAL(14,4) NOT NULL DEFAULT 0,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  metadata JSON DEFAULT NULL,
  PRIMARY KEY (id), CONSTRAINT fk_invoice_item_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS client_reminders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id VARCHAR(50) NOT NULL,
  project_id VARCHAR(50) DEFAULT NULL,
  kind ENUM('usage_limit','invoice','general') NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('queued','sent','failed') NOT NULL DEFAULT 'queued',
  sent_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_reminder_client (client_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
