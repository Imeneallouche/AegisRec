from typing import Any

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from aegisrec.api.deps import get_current_site
from aegisrec.controllers import assistant_controller
from aegisrec.core.database import get_db
from aegisrec.models.site import Site
from aegisrec.schemas import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantConversationListItem,
    AssistantConversationMessagesResponse,
    AssistantConversationRename,
)

router = APIRouter(tags=["assistant"])


@router.get("/assistant/conversations", response_model=list[AssistantConversationListItem])
def list_assistant_conversations(
    site: Site = Depends(get_current_site),
    db: Session = Depends(get_db),
) -> Any:
    return assistant_controller.list_conversations(db, site)


@router.get(
    "/assistant/conversations/{conversation_id}/messages",
    response_model=AssistantConversationMessagesResponse,
)
def get_assistant_conversation_messages(
    conversation_id: int,
    site: Site = Depends(get_current_site),
    db: Session = Depends(get_db),
) -> Any:
    return assistant_controller.get_conversation_messages(db, site, conversation_id)


@router.patch(
    "/assistant/conversations/{conversation_id}",
    response_model=AssistantConversationListItem,
)
def patch_assistant_conversation(
    conversation_id: int,
    body: AssistantConversationRename,
    site: Site = Depends(get_current_site),
    db: Session = Depends(get_db),
) -> Any:
    return assistant_controller.rename_conversation(db, site, conversation_id, body)


@router.delete("/assistant/conversations/{conversation_id}", status_code=204)
def delete_assistant_conversation(
    conversation_id: int,
    site: Site = Depends(get_current_site),
    db: Session = Depends(get_db),
) -> Response:
    return assistant_controller.delete_conversation(db, site, conversation_id)


@router.post("/assistant/chat", response_model=AssistantChatResponse)
def assistant_chat(
    body: AssistantChatRequest,
    site: Site = Depends(get_current_site),
    db: Session = Depends(get_db),
) -> Any:
    return assistant_controller.chat(db, site, body)
