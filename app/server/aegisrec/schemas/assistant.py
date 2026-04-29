from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatMessagePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    created_at: datetime


class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    conversation_id: int | None = None


class AssistantChatResponse(BaseModel):
    reply: str
    context_summary: dict[str, Any] = Field(default_factory=dict)
    conversation_id: int
    user_message: ChatMessagePublic
    assistant_message: ChatMessagePublic


class AssistantConversationListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str | None
    created_at: datetime
    updated_at: datetime
    message_count: int


class AssistantConversationRename(BaseModel):
    """Rename payload — title is normalized (trim, collapse whitespace)."""

    title: str = Field(min_length=1, max_length=512)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, v: str) -> str:
        t = " ".join(v.strip().split())
        if not t:
            raise ValueError("Title cannot be empty or whitespace only")
        return t[:512]


class AssistantConversationMessagesResponse(BaseModel):
    conversation_id: int
    messages: list[ChatMessagePublic]
