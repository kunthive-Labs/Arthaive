-- 020_analytics_views.sql
-- Push the site-wide analytics aggregations into Postgres.
--
-- Previously lib/db/analytics.ts paged the entire ~13.7k-row deals table out of
-- Supabase on EVERY request and re-aggregated in JS. These views/RPCs do the
-- group-by in the database instead, returning only the aggregated rows.
--
-- Posture notes:
--   * All objects are SECURITY INVOKER (the default for views/SQL functions) so
--     they run with the caller's privileges and honour the existing RLS on
--     `deals` (deals_public_read => `using (true)`). No SECURITY DEFINER, no
--     privilege escalation.
--   * Every aggregation filters `record_status = 'verified'` to match the exact
--     population the TypeScript layer counted (it filtered `.eq("record_status",
--     "verified")`). This deliberately differs from the unfiltered mv_* views in
--     005_views.sql so public counts stay identical to the old JS path.
--   * Functions are marked STABLE so the planner/PostgREST can treat them as
--     read-only and cache within a statement.

-- ---------------------------------------------------------------------------
-- Sector aggregation  (getSectorStats)
-- One row per sector (sectors is text[], unnested), verified deals only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_analytics_sector_stats AS
  SELECT
    s.sector                                  AS sector,
    COUNT(*)                                  AS deal_count,
    COALESCE(SUM(d.amount_inr), 0)            AS total_funding,
    CASE WHEN COUNT(*) > 0
         THEN COALESCE(SUM(d.amount_inr), 0) / COUNT(*)
         ELSE 0 END                           AS avg_deal_size
  FROM deals d
  CROSS JOIN LATERAL unnest(d.sectors) AS s(sector)
  WHERE d.record_status = 'verified'
  GROUP BY s.sector;

-- ---------------------------------------------------------------------------
-- City aggregation  (getCityFunding)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_analytics_city_stats AS
  SELECT
    d.location                                AS city,
    COUNT(*)                                  AS deal_count,
    COALESCE(SUM(d.amount_inr), 0)            AS total_funding
  FROM deals d
  WHERE d.record_status = 'verified'
  GROUP BY d.location;

-- ---------------------------------------------------------------------------
-- Stage aggregation  (getStageDistribution)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_analytics_stage_stats AS
  SELECT
    d.stage                                   AS stage,
    COUNT(*)                                  AS deal_count,
    COALESCE(SUM(d.amount_inr), 0)            AS total_funding
  FROM deals d
  WHERE d.record_status = 'verified'
  GROUP BY d.stage;

-- ---------------------------------------------------------------------------
-- Year-over-year aggregation  (getYoYComparison)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_analytics_yoy AS
  SELECT
    TO_CHAR(d.deal_date, 'YYYY')              AS year,
    COUNT(*)                                  AS deal_count,
    COALESCE(SUM(d.amount_inr), 0)            AS total_funding
  FROM deals d
  WHERE d.record_status = 'verified'
  GROUP BY TO_CHAR(d.deal_date, 'YYYY');

-- ---------------------------------------------------------------------------
-- Investor activity aggregation  (getTopInvestorsByActivity)
-- Undisclosed-investor sentinels are excluded here so the DB row count matches
-- the JS filter that skipped "" / "Not Disclosed" / "Undisclosed".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_analytics_investor_activity AS
  SELECT
    i.investor                                AS name,
    COUNT(*)                                  AS deal_count,
    COALESCE(SUM(d.amount_inr), 0)            AS total_deployed
  FROM deals d
  CROSS JOIN LATERAL unnest(d.investors) AS i(investor)
  WHERE d.record_status = 'verified'
    AND i.investor IS NOT NULL
    AND i.investor <> ''
    AND i.investor <> 'Not Disclosed'
    AND i.investor <> 'Undisclosed'
  GROUP BY i.investor;

-- ---------------------------------------------------------------------------
-- Site-wide scalar rollup  (getSiteStats)
-- Returns a single row carrying every scalar the SiteStats shape needs, so the
-- client makes one round-trip instead of paging the whole table.
--   total_deals            -> SiteStats.totalDeals
--   total_disclosed_funding-> SiteStats.totalDisclosedFunding
--   disclosed_deals_count  -> SiteStats.disclosedDealsCount
--   top_sector / top_sector_count
--   largest_deal_company / largest_deal_amount
--   unique_investors / unique_cities / unique_sectors
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_site_stats()
RETURNS TABLE(
  total_deals             bigint,
  total_disclosed_funding numeric,
  disclosed_deals_count   bigint,
  top_sector              text,
  top_sector_count        bigint,
  largest_deal_company    text,
  largest_deal_amount     numeric,
  unique_investors        bigint,
  unique_cities           bigint,
  unique_sectors          bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH verified AS (
    SELECT company, amount_inr, sectors, investors, location
    FROM deals
    WHERE record_status = 'verified'
  ),
  base AS (
    SELECT
      COUNT(*)                                                  AS total_deals,
      COALESCE(SUM(amount_inr) FILTER (WHERE amount_inr > 0),0) AS total_disclosed_funding,
      COUNT(*) FILTER (WHERE amount_inr > 0)                    AS disclosed_deals_count,
      COUNT(DISTINCT location)                                  AS unique_cities
    FROM verified
  ),
  largest AS (
    SELECT company, amount_inr
    FROM verified
    WHERE amount_inr > 0
    ORDER BY amount_inr DESC
    LIMIT 1
  ),
  sector_counts AS (
    SELECT s.sector, COUNT(*) AS cnt
    FROM verified v
    CROSS JOIN LATERAL unnest(v.sectors) AS s(sector)
    GROUP BY s.sector
  ),
  top_sector AS (
    SELECT sector, cnt
    FROM sector_counts
    ORDER BY cnt DESC
    LIMIT 1
  ),
  sector_total AS (
    SELECT COUNT(*) AS unique_sectors FROM sector_counts
  ),
  investor_total AS (
    SELECT COUNT(DISTINCT i.investor) AS unique_investors
    FROM verified v
    CROSS JOIN LATERAL unnest(v.investors) AS i(investor)
    WHERE i.investor IS NOT NULL
      AND i.investor <> ''
      AND i.investor <> 'Not Disclosed'
      AND i.investor <> 'Undisclosed'
  )
  SELECT
    base.total_deals,
    base.total_disclosed_funding,
    base.disclosed_deals_count,
    COALESCE(top_sector.sector, '')          AS top_sector,
    COALESCE(top_sector.cnt, 0)              AS top_sector_count,
    COALESCE(largest.company, 'N/A')         AS largest_deal_company,
    COALESCE(largest.amount_inr, 0)          AS largest_deal_amount,
    investor_total.unique_investors,
    base.unique_cities,
    sector_total.unique_sectors
  FROM base
  CROSS JOIN sector_total
  CROSS JOIN investor_total
  LEFT JOIN top_sector ON true
  LEFT JOIN largest ON true;
$$;

-- ---------------------------------------------------------------------------
-- Grants — match the public-read posture of `deals`.
-- anon + authenticated may read the views and execute the rollup function.
-- ---------------------------------------------------------------------------
GRANT SELECT ON v_analytics_sector_stats      TO anon, authenticated;
GRANT SELECT ON v_analytics_city_stats        TO anon, authenticated;
GRANT SELECT ON v_analytics_stage_stats       TO anon, authenticated;
GRANT SELECT ON v_analytics_yoy               TO anon, authenticated;
GRANT SELECT ON v_analytics_investor_activity TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_site_stats()    TO anon, authenticated;
