"""Tests for locations search endpoint."""

from typing import Any
from unittest.mock import MagicMock, patch

import httpx
from fastapi.testclient import TestClient


class TestLocationsEndpoint:
    """Test locations search endpoint."""

    def test_locations_endpoint_missing_query(self, client: TestClient) -> None:
        """Test locations endpoint with missing query parameter."""
        response = client.get("/locations")
        assert response.status_code == 422
        assert "Field required" in response.json()["detail"][0]["msg"]

    def test_locations_endpoint_empty_query(self, client: TestClient) -> None:
        """Test locations endpoint with empty query parameter."""
        response = client.get("/locations?query=")
        assert response.status_code == 400
        assert response.json()["detail"] == "Query parameter is required"

    def test_locations_endpoint_success(self, client: TestClient) -> None:
        """Test successful location search."""
        mock_response: dict[str, Any] = {
            "results": [
                {
                    "name": "London",
                    "admin1": "England",
                    "country": "United Kingdom",
                    "latitude": 51.5074,
                    "longitude": -0.1278,
                },
                {
                    "name": "London",
                    "admin1": "Ontario",
                    "country": "Canada",
                    "latitude": 42.9834,
                    "longitude": -81.2497,
                },
            ]
        }

        with patch("httpx.AsyncClient") as mock_client:
            mock_response_obj = MagicMock()
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None

            mock_client.return_value.__aenter__.return_value.get.return_value = (
                mock_response_obj
            )

            response = client.get("/locations?query=London")

            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2

            # Check first result
            assert data[0]["name"] == "London"
            assert data[0]["region"] == "England"
            assert data[0]["country"] == "United Kingdom"
            assert data[0]["lat"] == 51.5074
            assert data[0]["lon"] == -0.1278  # Note: frontend expects 'lon' not 'lng'

    def test_locations_endpoint_no_results(self, client: TestClient) -> None:
        """Test location search with no results."""
        mock_response: dict[str, Any] = {"results": []}

        with patch("httpx.AsyncClient") as mock_client:
            mock_response_obj = MagicMock()
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None

            mock_client.return_value.__aenter__.return_value.get.return_value = (
                mock_response_obj
            )

            response = client.get("/locations?query=InvalidLocationXYZ")

            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 0

    def test_locations_endpoint_service_error(self, client: TestClient) -> None:
        """Test location search when geocoding service fails."""
        with patch("httpx.AsyncClient") as mock_client:
            # Simulate HTTP error
            mock_client.return_value.__aenter__.return_value.get.side_effect = (
                httpx.RequestError("Connection failed")
            )

            response = client.get("/locations?query=London")

            assert response.status_code == 503
            assert response.json()["detail"] == "Geocoding service unavailable"
