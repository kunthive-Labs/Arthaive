-- Materialised views for fast dashboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sector_summary AS
  SELECT
    unnest(sectors) AS sector,
    COUNT(*) AS deal_count,
    SUM(amount_inr) AS total_funding,
    AVG(amount_inr) AS avg_deal_size,
    MAX(date) AS latest_date
  FROM deals
  GROUP BY unnest(sectors);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sector_summary_sector ON mv_sector_summary(sector);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_investor_summary AS
  SELECT
    unnest(investors) AS investor,
    COUNT(*) AS deal_count,
    SUM(amount_inr) AS total_deployed,
    array_agg(DISTINCT unnest(sectors)) AS sectors
  FROM deals
  GROUP BY unnest(investors);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_investor_summary_investor ON mv_investor_summary(investor);

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sector_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_investor_summary;
$$ LANGUAGE sql;
