-- Aggregate functions for analytics
CREATE OR REPLACE FUNCTION get_sector_stats(p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS TABLE(sector text, deal_count bigint, total_funding numeric, avg_deal_size numeric) AS $$
  SELECT
    unnest(sectors) AS sector,
    COUNT(*) AS deal_count,
    SUM(amount_inr) AS total_funding,
    AVG(amount_inr) AS avg_deal_size
  FROM deals
  WHERE (p_from IS NULL OR deal_date >= p_from)
    AND (p_to IS NULL OR deal_date <= p_to)
  GROUP BY unnest(sectors)
  ORDER BY total_funding DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_monthly_trend(p_year int DEFAULT EXTRACT(YEAR FROM NOW())::int)
RETURNS TABLE(month text, deal_count bigint, total_funding numeric) AS $$
  SELECT
    TO_CHAR(deal_date, 'YYYY-MM') AS month,
    COUNT(*) AS deal_count,
    SUM(amount_inr) AS total_funding
  FROM deals
  WHERE EXTRACT(YEAR FROM deal_date) = p_year
  GROUP BY TO_CHAR(deal_date, 'YYYY-MM')
  ORDER BY month;
$$ LANGUAGE sql STABLE;
