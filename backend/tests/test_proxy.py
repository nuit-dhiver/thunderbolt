"""Tests for proxy functionality."""

import gzip
import json
from unittest.mock import AsyncMock, MagicMock, patch

import brotli
import httpx
import pytest
from fastapi.testclient import TestClient

from proxy import ProxyConfig, ProxyService


@pytest.mark.asyncio
async def test_proxy_handles_httpx_auto_decompression() -> None:
    """Test that proxy correctly handles when httpx automatically decompresses brotli content."""
    # Create a proxy service
    proxy_service = ProxyService()
    proxy_service.register_proxy(
        "/test/api",
        ProxyConfig(
            target_url="https://api.example.com",
            api_key="test-key",
            require_auth=False,
        ),
    )

    # Mock the httpx response
    mock_response = MagicMock(spec=httpx.Response)

    # Simulate httpx returning decompressed JSON content but with br encoding header still present
    json_content = {"test": "data", "value": 123}
    json_bytes = json.dumps(json_content).encode("utf-8")

    # Headers indicate brotli compression, but content is already decompressed
    mock_response.headers = {
        "content-type": "application/json",
        "content-encoding": "br",
    }
    mock_response.status_code = 200
    mock_response.read.return_value = json_bytes  # Already decompressed content
    mock_response.content = json_bytes

    # Mock the request
    mock_request = MagicMock()
    mock_request.method = "GET"
    mock_request.headers = {"accept": "application/json"}
    mock_request.url.query = None
    mock_request.body = AsyncMock(return_value=b"")

    # Mock the httpx client request
    with patch.object(
        proxy_service.client, "request", return_value=mock_response
    ) as mock_client_request:
        mock_client_request.return_value = mock_response

        # Call proxy_request
        response = await proxy_service.proxy_request(
            mock_request, "test", proxy_service.configs["/test/api"]
        )

        # Verify the response
        assert response.status_code == 200

        # Content should be the JSON data (not compressed)
        response_data = json.loads(response.body)
        assert response_data == json_content

        # Content-encoding header should be removed
        assert "content-encoding" not in response.headers


@pytest.mark.asyncio
async def test_proxy_handles_actual_brotli_compression() -> None:
    """Test that proxy correctly decompresses actual brotli-compressed content."""
    # Create a proxy service
    proxy_service = ProxyService()
    proxy_service.register_proxy(
        "/test/api",
        ProxyConfig(
            target_url="https://api.example.com",
            api_key="test-key",
            require_auth=False,
        ),
    )

    # Mock the httpx response with actual brotli-compressed content
    mock_response = MagicMock(spec=httpx.Response)

    # Create actual brotli-compressed content
    json_content = {"test": "compressed data", "value": 456}
    json_bytes = json.dumps(json_content).encode("utf-8")
    compressed_content = brotli.compress(json_bytes)

    # Headers indicate brotli compression
    mock_response.headers = {
        "content-type": "application/json",
        "content-encoding": "br",
    }
    mock_response.status_code = 200
    mock_response.read.return_value = compressed_content  # Actually compressed
    mock_response.content = compressed_content

    # Mock the request
    mock_request = MagicMock()
    mock_request.method = "GET"
    mock_request.headers = {"accept": "application/json"}
    mock_request.url.query = None
    mock_request.body = AsyncMock(return_value=b"")

    # Mock the httpx client request
    with patch.object(
        proxy_service.client, "request", return_value=mock_response
    ) as mock_client_request:
        mock_client_request.return_value = mock_response

        # Call proxy_request
        response = await proxy_service.proxy_request(
            mock_request, "test", proxy_service.configs["/test/api"]
        )

        # Verify the response
        assert response.status_code == 200

        # Content should be decompressed JSON
        response_data = json.loads(response.body)
        assert response_data == json_content

        # Content-encoding header should be removed
        assert "content-encoding" not in response.headers


@pytest.mark.asyncio
async def test_proxy_handles_gzip_compression() -> None:
    """Test that proxy correctly handles gzip compression."""
    # Create a proxy service
    proxy_service = ProxyService()
    proxy_service.register_proxy(
        "/test/api",
        ProxyConfig(
            target_url="https://api.example.com",
            api_key="test-key",
            require_auth=False,
        ),
    )

    # Mock the httpx response with gzip-compressed content
    mock_response = MagicMock(spec=httpx.Response)

    # Create gzip-compressed content
    json_content = {"test": "gzip data", "value": 789}
    json_bytes = json.dumps(json_content).encode("utf-8")
    compressed_content = gzip.compress(json_bytes)

    # Headers indicate gzip compression
    mock_response.headers = {
        "content-type": "application/json",
        "content-encoding": "gzip",
    }
    mock_response.status_code = 200
    mock_response.read.return_value = compressed_content
    mock_response.content = compressed_content

    # Mock the request
    mock_request = MagicMock()
    mock_request.method = "GET"
    mock_request.headers = {"accept": "application/json"}
    mock_request.url.query = None
    mock_request.body = AsyncMock(return_value=b"")

    # Mock the httpx client request
    with patch.object(
        proxy_service.client, "request", return_value=mock_response
    ) as mock_client_request:
        mock_client_request.return_value = mock_response

        # Call proxy_request
        response = await proxy_service.proxy_request(
            mock_request, "test", proxy_service.configs["/test/api"]
        )

        # Verify the response
        assert response.status_code == 200

        # Content should be decompressed JSON
        response_data = json.loads(response.body)
        assert response_data == json_content

        # Content-encoding header should be removed
        assert "content-encoding" not in response.headers


def test_proxy_auth_required(client: TestClient) -> None:
    """Test that proxy requires authentication when configured."""
    # When weather proxy is not configured, we should get 404
    response = client.get("/proxy/weather/current.json?q=London")
    # If weather proxy is not configured (no WEATHER_API_KEY in test env), expect 404
    # If it is configured, expect 401 due to missing auth
    assert response.status_code in [401, 404]
    if response.status_code == 401:
        assert response.json()["detail"] == "Unauthorized"
    else:
        assert response.json()["detail"] == "Proxy path not configured"


def test_proxy_with_auth(client: TestClient) -> None:
    """Test proxy with proper authentication."""
    # This would need proper mocking of the weather API response
    # For now, just test that auth header is accepted
    headers = {"Authorization": "Bearer test-token"}
    with patch("proxy.ProxyService.proxy_request") as mock_proxy:
        mock_proxy.return_value = MagicMock(
            status_code=200,
            body=b'{"test": "data"}',
            headers={},
        )
        response = client.get("/proxy/weather/current.json?q=London", headers=headers)
        # Should not return 401 if auth is provided
        assert response.status_code != 401
