import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from azure.cosmos import exceptions

from .cosmosdb_service import CosmosConversationClient


class PlannerItemService:
    """Persist personal planner items (reminders, todos) in the shared Cosmos container."""

    PLANNER_TYPE = "plannerItem"

    def __init__(self, cosmos_client: CosmosConversationClient):
        self._client = cosmos_client
        self._container = cosmos_client.container_client

    async def list_items(self, user_id: str, item_type: Optional[str] = None) -> List[Dict[str, Any]]:
        parameters = [
            {"name": "@userId", "value": user_id},
            {"name": "@plannerType", "value": self.PLANNER_TYPE},
        ]
        query = "SELECT * FROM c WHERE c.userId = @userId AND c.type = @plannerType"
        if item_type:
            query += " AND c.itemType = @itemType"
            parameters.append({"name": "@itemType", "value": item_type})
        query += " ORDER BY c.createdAt DESC"

        items: List[Dict[str, Any]] = []
        async for document in self._container.query_items(query=query, parameters=parameters):
            items.append(document)
        return items

    async def create_item(
        self,
        user_id: str,
        item_type: str,
        label: str,
        *,
        time: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        document = {
            "id": str(uuid.uuid4()),
            "type": self.PLANNER_TYPE,
            "userId": user_id,
            "itemType": item_type,
            "label": label,
            "time": time,
            "completed": False,
            "createdAt": now,
            "updatedAt": now,
        }
        try:
            await self._container.upsert_item(document)
            return document
        except exceptions.CosmosHttpResponseError as exc:
            logging.exception("Failed to persist planner item", exc_info=exc)
            raise

    async def update_item(
        self,
        user_id: str,
        item_id: str,
        updates: Dict[str, Any],
        *,
        expected_item_type: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        try:
            existing = await self._container.read_item(item=item_id, partition_key=user_id)
        except exceptions.CosmosResourceNotFoundError:
            return None

        if expected_item_type and existing.get("itemType") != expected_item_type:
            return None
        if existing.get("type") != self.PLANNER_TYPE:
            return None

        existing.update({k: v for k, v in updates.items() if k in {"label", "time", "completed"}})
        existing["updatedAt"] = datetime.utcnow().isoformat()

        try:
            await self._container.upsert_item(existing)
            return existing
        except exceptions.CosmosHttpResponseError as exc:
            logging.exception("Failed to update planner item", exc_info=exc)
            raise

    async def delete_item(
        self,
        user_id: str,
        item_id: str,
        *,
        expected_item_type: Optional[str] = None,
    ) -> bool:
        try:
            existing = await self._container.read_item(item=item_id, partition_key=user_id)
        except exceptions.CosmosResourceNotFoundError:
            return False

        if expected_item_type and existing.get("itemType") != expected_item_type:
            return False
        if existing.get("type") != self.PLANNER_TYPE:
            return False

        try:
            await self._container.delete_item(item=item_id, partition_key=user_id)
            return True
        except exceptions.CosmosHttpResponseError as exc:
            logging.exception("Failed to delete planner item", exc_info=exc)
            raise
