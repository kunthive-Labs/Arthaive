-- Seed data for development / testing
-- Run after 001_initial_schema.sql

INSERT INTO sectors (name, slug) VALUES
  ('Fintech', 'fintech'),
  ('Edtech', 'edtech'),
  ('Healthtech', 'healthtech'),
  ('SaaS', 'saas'),
  ('E-Commerce', 'e-commerce'),
  ('Logistics', 'logistics'),
  ('Agritech', 'agritech'),
  ('Cleantech', 'cleantech'),
  ('D2C', 'd2c'),
  ('Gaming', 'gaming'),
  ('Mobility', 'mobility'),
  ('HR Tech', 'hr-tech')
ON CONFLICT (slug) DO NOTHING;
