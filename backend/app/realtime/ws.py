"""WebSocket hub — Pusher + laravel-echo ka replacement.

Restaurant module mein kitchen/order screen ko live updates chahiye. Pusher SaaS
ki jagah native WebSockets + Redis pub/sub. Redis isliye zaroori hai ke multiple
uvicorn workers hote hain — worker A par bani sale worker B se juday kitchen
screen tak pahunchni chahiye.

Channels tenant-scoped hain: `business:{id}:orders`
"""

from broadcaster import Broadcast
from fastapi import WebSocket, WebSocketDisconnect

from app.core.config import settings

broadcast = Broadcast(settings.REDIS_URL)


def orders_channel(business_id: int, location_id: int | None = None) -> str:
    return f"business:{business_id}:orders" + (f":{location_id}" if location_id else "")


async def publish(channel: str, message: str) -> None:
    await broadcast.publish(channel=channel, message=message)


async def subscribe(websocket: WebSocket, channel: str) -> None:
    """Client ko ek channel se joro aur messages forward karte raho."""
    await websocket.accept()
    async with broadcast.subscribe(channel=channel) as subscriber:
        try:
            async for event in subscriber:
                await websocket.send_text(event.message)
        except WebSocketDisconnect:
            pass
