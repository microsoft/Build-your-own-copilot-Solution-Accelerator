import logging
from datetime import datetime
from typing import Any, Dict, List

import httpx

GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"


async def fetch_calendar_events(
    access_token: str,
    *,
    start: datetime,
    end: datetime,
    timezone: str = "UTC",
    top: int = 10,
) -> List[Dict[str, Any]]:
    if not access_token:
        raise ValueError("Missing access token for Microsoft Graph call")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
        "Prefer": f'outlook.timezone="{timezone}"',
    }
    params = {
        "startDateTime": start.isoformat(),
        "endDateTime": end.isoformat(),
        "$orderby": "start/dateTime",
        "$top": top,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{GRAPH_BASE_URL}/me/calendarview",
            headers=headers,
            params=params,
        )
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logging.exception("Microsoft Graph calendar request failed", exc_info=exc)
            raise

    data = response.json()
    events = data.get("value", [])
    return [
        {
            "id": event.get("id"),
            "subject": event.get("subject"),
            "start": event.get("start"),
            "end": event.get("end"),
            "location": (event.get("location") or {}).get("displayName"),
            "isAllDay": event.get("isAllDay"),
        }
        for event in events
    ]
