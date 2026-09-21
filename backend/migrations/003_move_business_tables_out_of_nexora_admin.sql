-- Move legacy business-domain data out of nexora_admin.
--
-- Run only after 002_commercial_management.sql. This migration deliberately
-- moves legacy tables instead of deleting them, so rollback/data comparison is
-- still possible. Administrative identities, auth tokens, roles, permissions,
-- onboarding jobs and tickets remain in nexora_admin.

-- ---------------------------------------------------------------------------
-- 1. Populate the canonical commercial model in nexora.
-- ---------------------------------------------------------------------------

INSERT INTO nexora.subscription_plans
  (id, code, name, description, currency, base_price, billing_interval,
   interval_days, is_custom, status, created_at, updated_at)
SELECT
  id,
  CONCAT('legacy-', id),
  plan_name,
  JSON_UNQUOTE(JSON_EXTRACT(additional_data, '$.description')),
  COALESCE(JSON_UNQUOTE(JSON_EXTRACT(additional_data, '$.currency')), 'USD'),
  COALESCE(JSON_EXTRACT(additional_data, '$.base_price') + 0, 0),
  billing_cycle,
  CASE WHEN billing_cycle = 'custom'
       THEN COALESCE(JSON_EXTRACT(additional_data, '$.interval_days') + 0, 30)
       ELSE NULL END,
  billing_cycle = 'custom',
  IF(is_active = 1, 'active', 'archived'),
  created_at,
  updated_at
FROM nexora_admin.subscription_plans
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  billing_interval = VALUES(billing_interval),
  interval_days = VALUES(interval_days),
  status = VALUES(status),
  updated_at = VALUES(updated_at);

INSERT INTO nexora.client_subscriptions
  (id, client_id, project_id, plan_id, status, starts_on, ends_on,
   trial_ends_on, custom_overrides, created_at, updated_at)
SELECT
  id, client_id, project_id, plan_id,
  IF(is_deleted = 'yes', 'cancelled', status),
  start_date, end_date, trial_end,
  JSON_OBJECT('legacy_is_deleted', is_deleted),
  created_at, updated_at
FROM nexora_admin.client_subscription
ON DUPLICATE KEY UPDATE
  plan_id = VALUES(plan_id),
  status = VALUES(status),
  starts_on = VALUES(starts_on),
  ends_on = VALUES(ends_on),
  trial_ends_on = VALUES(trial_ends_on),
  updated_at = VALUES(updated_at);

INSERT INTO nexora.invoices
  (id, invoice_number, client_id, project_id, status, currency, period_start,
   period_end, subtotal, discount_type, discount_value, discount_total,
   taxable_total, tax_rate, tax_total, total, notes, sent_at, paid_at,
   created_at, updated_at)
SELECT
  b.id,
  CONCAT('LEGACY-', LPAD(b.id, 8, '0')),
  b.client_id,
  b.project_id,
  CASE b.status
    WHEN 'pending' THEN 'approval_pending'
    WHEN 'paid' THEN 'paid'
    WHEN 'failed' THEN 'void'
    WHEN 'void' THEN 'void'
    ELSE 'draft'
  END,
  LEFT(b.currency, 3),
  b.billing_period_start,
  b.billing_period_end,
  b.subtotal,
  IF(b.discount_amount > 0, 'fixed', 'none'),
  b.discount_amount,
  b.discount_amount,
  b.taxable_amount,
  CASE WHEN b.taxable_amount > 0
       THEN ROUND((b.tax_amount / b.taxable_amount) * 100, 4)
       ELSE 0 END,
  b.tax_amount,
  b.total_amount,
  CONCAT_WS('\n', b.notes,
    IF(b.payment_gateway_ref IS NULL, NULL,
       CONCAT('Legacy payment reference: ', b.payment_gateway_ref)),
    IF(b.confirmed_by IS NULL, NULL,
       CONCAT('Legacy confirmation: ', b.confirmed_by))),
  IF(b.status IN ('pending','paid'), b.generated_at, NULL),
  b.paid_at,
  b.generated_at,
  COALESCE(b.paid_at, b.generated_at)
FROM nexora_admin.billing_records b
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  subtotal = VALUES(subtotal),
  discount_total = VALUES(discount_total),
  taxable_total = VALUES(taxable_total),
  tax_total = VALUES(tax_total),
  total = VALUES(total),
  paid_at = VALUES(paid_at),
  updated_at = VALUES(updated_at);

INSERT INTO nexora.invoice_items
  (id, invoice_id, description, metric_code, channel, quantity, unit_price,
   amount, metadata)
SELECT
  id, billing_id, description, item_type, 'global', quantity, unit_price,
  amount, JSON_OBJECT('legacy_item_type', item_type)
FROM nexora_admin.billing_line_items
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  quantity = VALUES(quantity),
  unit_price = VALUES(unit_price),
  amount = VALUES(amount),
  metadata = VALUES(metadata);

INSERT INTO nexora.resource_usage_snapshots
  (id, client_id, project_id, metric_code, channel, quantity, period_start,
   period_end, measured_at)
SELECT
  id, client_id, project_id, metric_key, COALESCE(channel, 'global'),
  usage_count, TIMESTAMP(billing_period_start),
  TIMESTAMP(billing_period_end, '23:59:59'), created_at
FROM nexora_admin.usage_logs
ON DUPLICATE KEY UPDATE
  quantity = VALUES(quantity),
  period_start = VALUES(period_start),
  period_end = VALUES(period_end),
  measured_at = VALUES(measured_at);

-- ---------------------------------------------------------------------------
-- 2. Move business tables out of nexora_admin.
--
-- Tables without a canonical replacement retain their useful name in nexora.
-- Tables already mapped to the new model receive a legacy_ prefix.
-- ---------------------------------------------------------------------------

RENAME TABLE
  nexora_admin.basic_metric_config TO nexora.basic_metric_config,
  nexora_admin.channel_metric_config TO nexora.channel_metric_config,
  nexora_admin.client_basic_metric_values TO nexora.client_basic_metric_values,
  nexora_admin.client_channel_metric_values TO nexora.client_channel_metric_values,
  nexora_admin.client_specific_channels TO nexora.client_specific_channels,
  nexora_admin.events_based_on_crms TO nexora.events_based_on_crms,
  nexora_admin.event_properties_based_on_crms TO nexora.event_properties_based_on_crms,
  nexora_admin.event_property_mapping_rules TO nexora.event_property_mapping_rules,
  nexora_admin.notification_recipients TO nexora.notification_recipients,
  nexora_admin.plan_channel_mapping TO nexora.plan_channel_mapping,
  nexora_admin.plan_discount_config TO nexora.plan_discount_config,
  nexora_admin.tax_config TO nexora.tax_config,
  nexora_admin.billing_discount TO nexora.billing_discount,
  nexora_admin.usage_alert_log TO nexora.usage_alert_log,
  nexora_admin.subscription_plans TO nexora.legacy_subscription_plans,
  nexora_admin.client_subscription TO nexora.legacy_client_subscription,
  nexora_admin.billing_records TO nexora.legacy_billing_records,
  nexora_admin.billing_line_items TO nexora.legacy_billing_line_items,
  nexora_admin.usage_logs TO nexora.legacy_usage_logs;

-- Expected nexora_admin tables after migration:
-- admin_users, auth_otp_codes, modules, onboarding_job_steps, onboarding_jobs,
-- permissions, refresh_tokens, role_permissions, roles, tickets, users.
-- Review whether `users`, `modules`, and `tickets` belong to the admin control
-- plane before moving them; this migration intentionally leaves them untouched.
