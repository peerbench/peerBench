CREATE
OR REPLACE FUNCTION delete_old_notifications () RETURNS void AS $$
BEGIN
  DELETE FROM "notifications"
    WHERE
      "notifications"."read_at" IS NOT NULL AND
      "notifications"."read_at" < (NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

SELECT
  cron.schedule (
    'delete-old-notifications-weekly',
    '0 0 * * 1', -- Run every Monday at 00:00
    'SELECT delete_old_notifications()'
  );