-- Materialised views for fast dashboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sector_summary AS
  SELECT
    unnest(sectors) AS sector,
    COUNT(*) AS deal_count,
    SUM(amount_inr) AS total_funding,
    AVG(amount_inr) AS avg_deal_size,
    MAX(deal_date) AS latest_date
  FROM deals
  GROUP BY unnest(sectors);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sector_summary_sector ON mv_sector_summary(sector);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_investor_summary AS
  WITH inv AS (
    SELECT unnest(investors) AS investor, amount_inr
    FROM deals
  ),
  stats AS (
    SELECT investor, COUNT(*) AS deal_count, SUM(amount_inr) AS total_deployed
    FROM inv
    GROUP BY investor
  ),
  inv_sectors AS (
    SELECT i.investor, array_agg(DISTINCT s.sector) AS sectors
    FROM deals d
    CROSS JOIN LATERAL unnest(d.investors) AS i(investor)
    CROSS JOIN LATERAL unnest(d.sectors) AS s(sector)
    GROUP BY i.investor
  )
  SELECT stats.investor, stats.deal_count, stats.total_deployed, inv_sectors.sectors
  FROM stats
  LEFT JOIN inv_sectors ON inv_sectors.investor = stats.investor;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_investor_summary_investor ON mv_investor_summary(investor);

-- Note: not CONCURRENTLY — that cannot run inside a function's transaction.
-- Non-concurrent refresh briefly locks reads; acceptable at this data size.
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
  REFRESH MATERIALIZED VIEW mv_sector_summary;
  REFRESH MATERIALIZED VIEW mv_investor_summary;
$$ LANGUAGE sql;
