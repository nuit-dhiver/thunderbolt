# Combined MCP server with all tools
from fastmcp import FastMCP

# Import tools from individual modules
from .ddg_search import fetch_content, search
from .weather import get_current_weather, get_weather_forecast

# Initialize combined MCP server
mcp: FastMCP = FastMCP("thunderbolt-mcp")

# Register search tools
mcp.add_tool(search)
mcp.add_tool(fetch_content)

# Register weather tools
mcp.add_tool(get_current_weather)
mcp.add_tool(get_weather_forecast)
