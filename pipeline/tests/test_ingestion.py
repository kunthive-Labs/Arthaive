from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from pipeline import entity_resolver, queue
from pipeline.currency import normalize_amounts
from pipeline.run import _new_stats, _route_record
from pipeline.rule_extractor import extract_round_type, rule_extract


class IngestionTests(unittest.TestCase):
    def tearDown(self):
        entity_resolver.clear_index_cache()

    def test_currency_matches_database_and_ui_units(self):
        self.assertEqual(normalize_amounts({"amount_value": 15_000_000, "amount_currency": "USD"}), (12525.0, 15.0))
        self.assertEqual(normalize_amounts({"amount_value": 280_000_000, "amount_currency": "INR"}), (2800.0, 3.353293))
        self.assertEqual(normalize_amounts({"amount_value": None}), (0.0, 0.0))

    @patch("pipeline.entity_resolver._fuzzy_match", return_value=("Another Company", 40.0))
    @patch("pipeline.entity_resolver._exact_match", return_value=None)
    def test_high_confidence_new_company_is_published_with_scaled_amounts(self, exact, fuzzy):
        deps = SimpleNamespace(
            normalize_amounts=normalize_amounts,
            resolve=entity_resolver.resolve,
            resolve_investors=lambda names: names,
            find_duplicate_deal=Mock(return_value=None),
            insert_deal=Mock(return_value="new-deal"),
            update_review_item=Mock(),
        )
        stats = _new_stats()
        _route_record(
            extracted={"company": "Cent", "confidence": 0.91, "amount_value": 15_000_000,
                       "amount_currency": "USD", "stage": "Seed", "deal_date": "2026-10-27"},
            pub_date="2026-10-27", source_url="https://publisher.example/cent",
            source_id="source", queue_id="queue", stats=stats, deps=deps,
        )
        self.assertEqual(stats["records_auto_approved"], 1)
        self.assertEqual(deps.insert_deal.call_args.kwargs["company"], "Cent")
        self.assertEqual(deps.insert_deal.call_args.kwargs["amount_inr"], 12525.0)
        self.assertEqual(deps.insert_deal.call_args.kwargs["amount_usd"], 15.0)
        self.assertEqual(deps.find_duplicate_deal.call_args.kwargs["amount_inr"], 12525.0)
        self.assertEqual(deps.update_review_item.call_args.kwargs["status"], "approved")

    @patch("pipeline.entity_resolver._fuzzy_match", return_value=("Comat Technologies", 80.0))
    @patch("pipeline.entity_resolver._exact_match", return_value=None)
    def test_ambiguous_company_stays_unresolved(self, exact, fuzzy):
        result = entity_resolver.resolve("Coratia Technologies")
        self.assertIsNone(result.canonical)
        self.assertEqual(result.suggested, "Comat Technologies")

    @patch("pipeline.entity_resolver.boost_score", return_value=95.0)
    @patch("pipeline.entity_resolver._fuzzy_match", return_value=("Comat Technologies", 82.0))
    @patch("pipeline.entity_resolver._exact_match", return_value=None)
    def test_shared_context_cannot_auto_merge_differently_named_companies(self, exact, fuzzy, boost):
        result = entity_resolver.resolve("Coratia Technologies", context={"sectors": ["Deeptech & AI"]})
        self.assertIsNone(result.canonical)
        self.assertEqual(result.suggested, "Comat Technologies")

    def test_headline_round_takes_precedence_over_an_earlier_round(self):
        result = rule_extract(
            article_title="Coratia Technologies raises Rs 18 Cr in bridge round",
            article_text="Coratia Technologies raises Rs 18 crore in a bridge round. It earlier raised Rs 17 crore in a pre-Series A round.",
            source_tier="tier_1",
        )
        self.assertEqual(result["stage"], "Bridge")

    def test_undisclosed_extension_does_not_reuse_previous_round_amount(self):
        result = rule_extract(
            article_title="CHOSEN raises extended Series A round",
            article_text="CHOSEN has raised an extension of its Series A round. Prior to this, the startup had raised $5 million in a Series A round.",
            source_tier="tier_1",
        )
        self.assertIsNone(result["amount_value"])

    def test_current_series_a2_beats_previous_pre_series_a(self):
        result = rule_extract(
            article_title="Ace Blend raises $9.91 Mn",
            article_text="Ace Blend has raised $9.91 million in a Series A2 funding round. An investor previously led its pre-Series A round.",
            source_tier="tier_1",
        )
        self.assertEqual(result["stage"], "Series A")

    def test_customer_acquisition_is_not_a_funding_stage(self):
        result = rule_extract(
            article_title="ISLAND Beauty raises Rs 2.58 Cr",
            article_text="ISLAND Beauty has raised Rs 2.58 crore. The funds will be used for customer acquisition.",
            source_tier="tier_1",
        )
        self.assertIsNone(result["stage"])

    def test_pre_series_rounds_keep_their_qualifier(self):
        for letter in "ABCDEF":
            with self.subTest(letter=letter):
                self.assertEqual(extract_round_type(f"a pre-Series {letter} funding round")["stage"], f"Pre-Series {letter}")

    @patch("pipeline.entity_resolver.get_client")
    def test_matching_can_find_company_beyond_first_database_page(self, get_client):
        alias_query = Mock()
        alias_query.select.return_value = alias_query
        alias_query.order.return_value = alias_query
        alias_query.range.return_value = alias_query
        alias_query.execute.return_value = SimpleNamespace(data=[])
        deal_query = Mock()
        deal_query.select.return_value = deal_query
        deal_query.order.return_value = deal_query
        deal_query.range.return_value = deal_query
        deal_query.execute.side_effect = [
            SimpleNamespace(data=[{"company": f"Company {i}"} for i in range(1000)]),
            SimpleNamespace(data=[{"company": "Existing Startup"}]),
        ]
        get_client.return_value.table.side_effect = lambda name: deal_query if name == "deals" else alias_query
        candidate, score = entity_resolver._fuzzy_match("Existing Startup", "startup")
        self.assertEqual((candidate, score), ("Existing Startup", 100.0))
        self.assertEqual(deal_query.range.call_args.args, (1000, 1999))

    @patch("pipeline.queue.get_client")
    def test_retry_only_processes_unreviewed_pending_items(self, get_client):
        query = Mock()
        for method in ("select", "eq", "is_", "filter", "order", "limit"):
            getattr(query, method).return_value = query
        get_client.return_value.table.return_value = query
        query.execute.return_value = SimpleNamespace(data=[])
        queue.fetch_unextracted_items(retry_pending=True)
        query.eq.assert_called_once_with("status", "pending")
        self.assertEqual(query.is_.call_args_list[0].args, ("reviewed_at", "null"))
        self.assertEqual(query.is_.call_args_list[1].args, ("reviewed_by", "null"))
        query.filter.assert_not_called()
        queue.fetch_unextracted_items()
        query.filter.assert_called_once_with("raw_extracted_data", "eq", "{}")


if __name__ == "__main__":
    unittest.main()
