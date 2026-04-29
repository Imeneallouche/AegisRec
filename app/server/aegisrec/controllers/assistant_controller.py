from __future__ import annotations

from fastapi import HTTPException, Response, status
from sqlalchemy.orm import Session

from aegisrec.models.site import Site
from aegisrec.schemas import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantConversationListItem,
    AssistantConversationMessagesResponse,
    AssistantConversationRename,
)
from aegisrec.services import assistant_service


def chat(db: Session, site: Site, body: AssistantChatRequest) -> AssistantChatResponse:
    try:
        return assistant_service.process_chat(db, site, body.message, body.conversation_id)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Conversation not found") from None


def list_conversations(db: Session, site: Site) -> list[AssistantConversationListItem]:
    return assistant_service.list_conversations_with_counts(db, site.id)


def get_conversation_messages(
    db: Session, site: Site, conversation_id: int
) -> AssistantConversationMessagesResponse:
    out = assistant_service.get_conversation_messages(db, site.id, conversation_id)
    if out is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return out


def delete_conversation(db: Session, site: Site, conversation_id: int) -> Response:
    if not assistant_service.delete_conversation(db, site.id, conversation_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def rename_conversation(
    db: Session, site: Site, conversation_id: int, body: AssistantConversationRename
) -> AssistantConversationListItem:
    item = assistant_service.rename_conversation(db, site.id, conversation_id, body.title)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return item
