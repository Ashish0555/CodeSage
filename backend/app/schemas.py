from typing import Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class Register(BaseModel): name: str = Field(min_length=1, max_length=80); email: EmailStr; password: str = Field(min_length=6, max_length=128)
class Login(BaseModel): email: EmailStr; password: str = Field(min_length=1)
class CodeRequest(BaseModel): problemSlug: str; language: str; code: str = Field(min_length=1, max_length=50000)
class HintRequest(BaseModel): problemSlug: str; level: int = Field(ge=1, le=3); code: str|None = Field(default=None, max_length=50000)
class AskRequest(BaseModel): question: str = Field(min_length=3, max_length=1000); topic: str|None = None; company: str|None = None
class InterviewStart(BaseModel): problemSlug: str
class InterviewMessageIn(BaseModel): message: str = Field(min_length=1, max_length=5000)
class IngestRequest(BaseModel): text: str = Field(min_length=20); title: str; source: str|None = None; topics: list[str] = []; companies: list[str] = []
class ORM(BaseModel): model_config = ConfigDict(from_attributes=True)
