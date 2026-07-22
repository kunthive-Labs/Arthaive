from __future__ import annotations

import unittest
from unittest.mock import Mock, patch

import httpx

from pipeline import politeness


class RobotsLoadingTests(unittest.TestCase):
    def tearDown(self) -> None:
        politeness.reset_state()

    @patch("pipeline.politeness.httpx.get")
    def test_uses_declared_user_agent_and_parses_rules(self, get: Mock) -> None:
        request = httpx.Request("GET", "https://publisher.example/robots.txt")
        get.return_value = httpx.Response(
            200,
            request=request,
            text="User-agent: *\nDisallow: /private\nAllow: /feed\n",
        )

        parser = politeness._load_robots("https://publisher.example/feed")

        self.assertIsNotNone(parser)
        self.assertTrue(parser.can_fetch("ArthaiveBot", "https://publisher.example/feed"))
        self.assertFalse(parser.can_fetch("ArthaiveBot", "https://publisher.example/private/report"))
        get.assert_called_once_with(
            "https://publisher.example/robots.txt",
            headers={"User-Agent": politeness.HTTP_USER_AGENT},
            timeout=politeness.HTTP_TIMEOUT_SECONDS,
            follow_redirects=True,
        )

    @patch("pipeline.politeness.httpx.get")
    def test_denies_when_robots_endpoint_returns_forbidden(self, get: Mock) -> None:
        request = httpx.Request("GET", "https://publisher.example/robots.txt")
        get.return_value = httpx.Response(403, request=request)

        parser = politeness._load_robots("https://publisher.example/feed")

        self.assertIsNotNone(parser)
        self.assertFalse(parser.can_fetch("ArthaiveBot", "https://publisher.example/feed"))

    @patch("pipeline.politeness.httpx.get")
    def test_network_failure_keeps_documented_fail_open_behavior(self, get: Mock) -> None:
        get.side_effect = httpx.ConnectError("offline")

        parser = politeness._load_robots("https://publisher.example/feed")

        self.assertIsNone(parser)


if __name__ == "__main__":
    unittest.main()
