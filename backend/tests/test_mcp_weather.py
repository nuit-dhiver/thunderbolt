"""Tests for MCP weather tools."""

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastmcp import Context

from mcp_tools.weather import (
    OpenMeteoWeather,
    get_current_weather,
    get_weather_forecast,
    search_locations,
)


class TestOpenMeteoWeather:
    """Test OpenMeteoWeather class methods."""

    @pytest.mark.asyncio
    async def test_search_locations_success(self) -> None:
        """Test successful location search."""
        weather = OpenMeteoWeather()
        ctx = AsyncMock(spec=Context)

        # Mock response
        mock_response = {
            "results": [
                {
                    "latitude": 51.5074,
                    "longitude": -0.1278,
                    "name": "London",
                    "admin1": "England",
                    "country": "United Kingdom",
                    "timezone": "Europe/London",
                }
            ]
        }

        with patch("httpx.AsyncClient") as mock_client:
            mock_response_obj = MagicMock()
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None

            mock_client.return_value.__aenter__.return_value.get.return_value = (
                mock_response_obj
            )

            result = await weather.search_locations("London", ctx)

            assert isinstance(result, list)
            assert len(result) == 1
            assert result[0]["latitude"] == 51.5074
            assert result[0]["longitude"] == -0.1278
            assert result[0]["name"] == "London"
            assert result[0]["country"] == "United Kingdom"

            # Check that info was logged
            ctx.info.assert_called()

    @pytest.mark.asyncio
    async def test_search_locations_no_results(self) -> None:
        """Test location search with no results."""
        weather = OpenMeteoWeather()
        ctx = AsyncMock(spec=Context)

        # Mock empty response
        mock_response: dict[str, Any] = {"results": []}

        with patch("httpx.AsyncClient") as mock_client:
            mock_response_obj = MagicMock()
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None

            mock_client.return_value.__aenter__.return_value.get.return_value = (
                mock_response_obj
            )

            result = await weather.search_locations("InvalidLocation", ctx)

            assert result == []
            ctx.info.assert_called_with("No locations found matching: InvalidLocation")

    @pytest.mark.asyncio
    async def test_get_current_weather_success(self) -> None:
        """Test successful current weather retrieval by coordinates."""
        weather = OpenMeteoWeather()
        ctx = AsyncMock(spec=Context)

        # Mock weather response
        weather_response = {
            "current": {
                "temperature_2m": 15.5,
                "apparent_temperature": 14.2,
                "relative_humidity_2m": 75,
                "cloud_cover": 60,
                "wind_speed_10m": 12.5,
                "wind_direction_10m": 225,
                "weather_code": 3,
                "precipitation": 0,
                "time": "2024-01-20T14:00",
            }
        }

        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = weather_response
            mock_response.raise_for_status.return_value = None

            mock_client.return_value.__aenter__.return_value.get.return_value = (
                mock_response
            )

            result = await weather.get_current_weather(51.5074, -0.1278, ctx)

            assert "Current weather at coordinates (51.5074, -0.1278):" in result
            assert "Temperature: 15.5°C" in result
            assert "Feels like: 14.2°C" in result
            assert "Conditions: Overcast" in result
            assert "Humidity: 75%" in result
            assert "Cloud cover: 60%" in result
            assert "Wind: 12.5 km/h from SW" in result

    @pytest.mark.asyncio
    async def test_get_weather_forecast_success(self) -> None:
        """Test successful weather forecast retrieval by coordinates."""
        weather = OpenMeteoWeather()
        ctx = AsyncMock(spec=Context)

        # Mock forecast response
        forecast_response = {
            "daily": {
                "time": ["2024-01-20", "2024-01-21", "2024-01-22"],
                "weather_code": [1, 61, 3],
                "temperature_2m_max": [12.5, 10.2, 8.7],
                "temperature_2m_min": [5.3, 4.1, 2.8],
                "apparent_temperature_max": [11.2, 8.5, 7.1],
                "apparent_temperature_min": [3.8, 2.5, 1.2],
                "precipitation_sum": [0, 5.2, 0.5],
                "precipitation_probability_max": [0, 80, 20],
                "wind_speed_10m_max": [15.2, 22.1, 18.5],
            }
        }

        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = forecast_response
            mock_response.raise_for_status.return_value = None

            mock_client.return_value.__aenter__.return_value.get.return_value = (
                mock_response
            )

            result = await weather.get_weather_forecast(35.6762, 139.6503, 3, ctx)

            assert (
                "3-day weather forecast for coordinates (35.6762, 139.6503):" in result
            )
            assert "Conditions: Mainly clear" in result
            assert "High: 12.5°C" in result
            assert "Precipitation: 5.2 mm (probability: 80%)" in result

    @pytest.mark.asyncio
    async def test_get_weather_forecast_invalid_days(self) -> None:
        """Test forecast with invalid days parameter."""
        weather = OpenMeteoWeather()
        ctx = AsyncMock(spec=Context)

        result = await weather.get_weather_forecast(51.5074, -0.1278, 20, ctx)
        assert result == "Error: Days parameter must be between 1 and 16"

        result = await weather.get_weather_forecast(51.5074, -0.1278, 0, ctx)
        assert result == "Error: Days parameter must be between 1 and 16"

    def test_weather_description_mapping(self) -> None:
        """Test weather code to description mapping."""
        weather = OpenMeteoWeather()

        assert weather._get_weather_description(0) == "Clear sky"
        assert weather._get_weather_description(3) == "Overcast"
        assert weather._get_weather_description(61) == "Slight rain"
        assert weather._get_weather_description(95) == "Thunderstorm"
        assert weather._get_weather_description(999) == "Unknown (code 999)"

    def test_wind_direction_conversion(self) -> None:
        """Test wind direction conversion."""
        weather = OpenMeteoWeather()

        assert weather._get_wind_direction(0) == "N"
        assert weather._get_wind_direction(45) == "NE"
        assert weather._get_wind_direction(90) == "E"
        assert weather._get_wind_direction(180) == "S"
        assert weather._get_wind_direction(225) == "SW"
        assert weather._get_wind_direction(270) == "W"
        assert weather._get_wind_direction(315) == "NW"
        assert weather._get_wind_direction(360) == "N"


class TestMCPTools:
    """Test MCP tool functions."""

    @pytest.mark.asyncio
    async def test_get_current_weather_tool(self) -> None:
        """Test the MCP current weather tool."""
        ctx = AsyncMock(spec=Context)

        with patch("mcp_tools.weather.weather_client.get_current_weather") as mock_get:
            mock_get.return_value = (
                "Current weather at coordinates (51.5074, -0.1278): 15°C"
            )

            result = await get_current_weather.fn(51.5074, -0.1278, ctx)

            assert result == "Current weather at coordinates (51.5074, -0.1278): 15°C"
            mock_get.assert_called_once_with(51.5074, -0.1278, ctx)

    @pytest.mark.asyncio
    async def test_get_weather_forecast_tool(self) -> None:
        """Test the MCP weather forecast tool."""
        ctx = AsyncMock(spec=Context)

        with patch("mcp_tools.weather.weather_client.get_weather_forecast") as mock_get:
            mock_get.return_value = "3-day forecast for coordinates (51.5074, -0.1278)"

            result = await get_weather_forecast.fn(51.5074, -0.1278, ctx, days=3)

            assert result == "3-day forecast for coordinates (51.5074, -0.1278)"
            mock_get.assert_called_once_with(51.5074, -0.1278, 3, ctx)

    @pytest.mark.asyncio
    async def test_search_locations_tool(self) -> None:
        """Test the MCP location search tool."""
        ctx = AsyncMock(spec=Context)

        mock_locations = [
            {
                "name": "London",
                "admin1": "England",
                "country": "United Kingdom",
                "latitude": 51.5074,
                "longitude": -0.1278,
                "elevation": 25,
                "timezone": "Europe/London",
            }
        ]

        with patch("mcp_tools.weather.weather_client.search_locations") as mock_search:
            mock_search.return_value = mock_locations

            result = await search_locations.fn("London", ctx)

            assert "Found 1 locations matching 'London':" in result
            assert "London, England, United Kingdom" in result
            assert "Coordinates: 51.5074, -0.1278" in result
            assert "Elevation: 25m" in result
            mock_search.assert_called_once_with("London", ctx)
