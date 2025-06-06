import sys
import traceback
from datetime import datetime
from typing import Any

import httpx
from fastmcp import Context, FastMCP


class OpenMeteoWeather:
    """Client for interacting with Open-Meteo weather API."""

    BASE_URL = "https://api.open-meteo.com/v1"
    GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1"

    async def search_locations(
        self, query: str, ctx: Context, count: int = 10
    ) -> list[dict[str, Any]]:
        """Search for locations by name using Open-Meteo geocoding API."""
        try:
            await ctx.info(f"Searching for locations matching: {query}")

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.GEOCODING_URL}/search",
                    params={
                        "name": query,
                        "count": count,
                        "language": "en",
                        "format": "json",
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

            if not data.get("results"):
                await ctx.info(f"No locations found matching: {query}")
                return []

            # Transform results to a consistent format
            results = []
            for location in data["results"]:
                results.append(
                    {
                        "name": location.get("name", "Unknown"),
                        "admin1": location.get("admin1", ""),  # State/Province
                        "country": location.get("country", ""),
                        "latitude": location.get("latitude", 0),
                        "longitude": location.get("longitude", 0),
                        "elevation": location.get("elevation"),
                        "timezone": location.get("timezone", "auto"),
                    }
                )

            await ctx.info(f"Found {len(results)} locations matching '{query}'")
            return results

        except httpx.HTTPError as e:
            await ctx.error(f"HTTP error searching locations: {str(e)}")
            return []
        except Exception as e:
            await ctx.error(f"Error searching locations: {str(e)}")
            traceback.print_exc(file=sys.stderr)
            return []

    async def get_current_weather(self, lat: float, lng: float, ctx: Context) -> str:
        """Get current weather for specific coordinates."""
        try:
            await ctx.info(f"Fetching current weather for coordinates: {lat}, {lng}")

            # Get current weather data
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/forecast",
                    params={
                        "latitude": lat,
                        "longitude": lng,
                        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m",
                        "timezone": "auto",
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

            current = data.get("current", {})

            # Format the weather description
            weather_code = current.get("weather_code", 0)
            weather_desc = self._get_weather_description(weather_code)

            # Format the response
            result = []
            result.append(f"Current weather at coordinates ({lat}, {lng}):")
            result.append("")
            result.append(f"Temperature: {current.get('temperature_2m', 'N/A')}°C")
            result.append(f"Feels like: {current.get('apparent_temperature', 'N/A')}°C")
            result.append(f"Conditions: {weather_desc}")
            result.append(f"Humidity: {current.get('relative_humidity_2m', 'N/A')}%")
            result.append(f"Cloud cover: {current.get('cloud_cover', 'N/A')}%")
            result.append(
                f"Wind: {current.get('wind_speed_10m', 'N/A')} km/h from {self._get_wind_direction(current.get('wind_direction_10m', 0))}"
            )

            if current.get("precipitation", 0) > 0:
                result.append(f"Precipitation: {current.get('precipitation', 0)} mm")

            result.append("")
            result.append(f"Last updated: {current.get('time', 'Unknown')}")

            return "\n".join(result)

        except httpx.HTTPError as e:
            await ctx.error(f"HTTP error getting weather: {str(e)}")
            return f"Error: Could not fetch weather data ({str(e)})"
        except Exception as e:
            await ctx.error(f"Error getting weather: {str(e)}")
            traceback.print_exc(file=sys.stderr)
            return f"Error: An unexpected error occurred while fetching weather data ({str(e)})"

    async def get_weather_forecast(
        self, lat: float, lng: float, days: int, ctx: Context
    ) -> str:
        """Get weather forecast for specific coordinates."""
        try:
            # Validate days parameter
            if days < 1 or days > 16:
                return "Error: Days parameter must be between 1 and 16"

            await ctx.info(
                f"Fetching {days}-day forecast for coordinates: {lat}, {lng}"
            )

            # Get forecast data
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/forecast",
                    params={
                        "latitude": lat,
                        "longitude": lng,
                        "daily": "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
                        "timezone": "auto",
                        "forecast_days": days,
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

            daily = data.get("daily", {})

            # Format the forecast
            result = []
            result.append(
                f"{days}-day weather forecast for coordinates ({lat}, {lng}):"
            )
            result.append("")

            dates = daily.get("time", [])
            for i in range(min(len(dates), days)):
                date = dates[i]
                weather_code = (
                    daily["weather_code"][i]
                    if i < len(daily.get("weather_code", []))
                    else 0
                )

                result.append(f"{self._format_date(date)}:")
                result.append(
                    f"  Conditions: {self._get_weather_description(weather_code)}"
                )
                result.append(
                    f"  High: {daily['temperature_2m_max'][i]}°C (feels like {daily['apparent_temperature_max'][i]}°C)"
                )
                result.append(
                    f"  Low: {daily['temperature_2m_min'][i]}°C (feels like {daily['apparent_temperature_min'][i]}°C)"
                )

                precip = daily["precipitation_sum"][i]
                precip_prob = daily["precipitation_probability_max"][i]
                if precip > 0 or precip_prob > 0:
                    result.append(
                        f"  Precipitation: {precip} mm (probability: {precip_prob}%)"
                    )

                result.append(f"  Max wind: {daily['wind_speed_10m_max'][i]} km/h")
                result.append("")

            return "\n".join(result)

        except httpx.HTTPError as e:
            await ctx.error(f"HTTP error getting forecast: {str(e)}")
            return f"Error: Could not fetch forecast data ({str(e)})"
        except Exception as e:
            await ctx.error(f"Error getting forecast: {str(e)}")
            traceback.print_exc(file=sys.stderr)
            return f"Error: An unexpected error occurred while fetching forecast data ({str(e)})"

    def _get_weather_description(self, code: int) -> str:
        """Convert WMO weather code to description."""
        weather_codes = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Foggy",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            56: "Light freezing drizzle",
            57: "Dense freezing drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            66: "Light freezing rain",
            67: "Heavy freezing rain",
            71: "Slight snow fall",
            73: "Moderate snow fall",
            75: "Heavy snow fall",
            77: "Snow grains",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            85: "Slight snow showers",
            86: "Heavy snow showers",
            95: "Thunderstorm",
            96: "Thunderstorm with slight hail",
            99: "Thunderstorm with heavy hail",
        }
        return weather_codes.get(code, f"Unknown (code {code})")

    def _get_wind_direction(self, degrees: float) -> str:
        """Convert wind direction in degrees to compass direction."""
        directions = [
            "N",
            "NNE",
            "NE",
            "ENE",
            "E",
            "ESE",
            "SE",
            "SSE",
            "S",
            "SSW",
            "SW",
            "WSW",
            "W",
            "WNW",
            "NW",
            "NNW",
        ]
        index = round(degrees / 22.5) % 16
        return directions[index]

    def _format_date(self, date_str: str) -> str:
        """Format date string to be more readable."""
        try:
            date = datetime.fromisoformat(date_str)
            return date.strftime("%A, %B %d")
        except:
            return date_str


# Initialize FastMCP server
mcp: FastMCP = FastMCP("weather")
weather_client = OpenMeteoWeather()


@mcp.tool()
async def get_current_weather(lat: float, lng: float, ctx: Context) -> str:
    """
    Get the current weather for specified coordinates.

    Args:
        lat: Latitude coordinate
        lng: Longitude coordinate
        ctx: MCP context for logging
    """
    return await weather_client.get_current_weather(lat, lng, ctx)


@mcp.tool()
async def get_weather_forecast(
    lat: float, lng: float, ctx: Context, days: int = 3
) -> str:
    """
    Get the weather forecast for specified coordinates.

    Args:
        lat: Latitude coordinate
        lng: Longitude coordinate
        days: Number of days to forecast (1-16, default: 3)
        ctx: MCP context for logging
    """
    return await weather_client.get_weather_forecast(lat, lng, days, ctx)


@mcp.tool()
async def search_locations(query: str, ctx: Context) -> str:
    """
    Search for locations by name.

    Args:
        query: The location name to search for
        ctx: MCP context for logging
    """
    locations = await weather_client.search_locations(query, ctx)

    if not locations:
        return f"No locations found matching: {query}"

    # Format the results as a string
    result = []
    result.append(f"Found {len(locations)} locations matching '{query}':")
    result.append("")

    for i, location in enumerate(locations, 1):
        # Build location string
        location_parts = [location["name"]]
        if location.get("admin1"):
            location_parts.append(location["admin1"])
        if location.get("country"):
            location_parts.append(location["country"])

        location_str = ", ".join(location_parts)

        result.append(f"{i}. {location_str}")
        result.append(
            f"   Coordinates: {location['latitude']}, {location['longitude']}"
        )
        if location.get("elevation") is not None:
            result.append(f"   Elevation: {location['elevation']}m")
        result.append("")

    return "\n".join(result).strip()
