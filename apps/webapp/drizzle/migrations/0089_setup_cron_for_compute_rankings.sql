-- Execute once to have initial data
SELECT
  compute_rankings ();

SELECT
  cron.schedule (
    'compute-rankings-daily',
    '0 2 * * *', -- Run at 2 AM daily
    'SELECT compute_rankings()'
  );