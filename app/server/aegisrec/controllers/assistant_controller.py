from __future__ import annotations

from sqlalchemy.orm import Session

from aegisrec.models.site import Site
from aegisrec.schemas import AssistantChatRequest, AssistantChatResponse
from aegisrec.services import assistant_service


def chat(db: Session, site: Site, body: AssistantChatRequest) -> AssistantChatResponse:
    return assistant_service.build_chat_reply(db, site, body.message)
