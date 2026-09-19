import enum
import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, JSON, Float, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


def uuid_value(): return str(uuid.uuid4())

class UserRole(str, enum.Enum): user = 'user'; admin = 'admin'
class ProblemDifficulty(str, enum.Enum): Easy = 'Easy'; Medium = 'Medium'; Hard = 'Hard'
class SubmissionVerdict(str, enum.Enum): AC = 'AC'; WA = 'WA'; TLE = 'TLE'; CE = 'CE'; RE = 'RE'
class InterviewStatus(str, enum.Enum): active = 'active'; finished = 'finished'
class InterviewRole(str, enum.Enum): interviewer = 'interviewer'; candidate = 'candidate'

class User(Base):
    __tablename__ = 'users'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_value)
    name: Mapped[str] = mapped_column(String(80)); email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String); role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.user)
    stats: Mapped[dict] = mapped_column(JSON, default=dict); created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now()); updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

class Problem(Base):
    __tablename__ = 'problems'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_value); slug: Mapped[str] = mapped_column(String, unique=True, index=True); title: Mapped[str] = mapped_column(String); statement: Mapped[str] = mapped_column(Text); difficulty: Mapped[ProblemDifficulty] = mapped_column(Enum(ProblemDifficulty)); topics: Mapped[list] = mapped_column(JSON, default=list); companies: Mapped[list] = mapped_column(JSON, default=list); constraints: Mapped[str] = mapped_column(Text, default=''); examples: Mapped[dict] = mapped_column(JSON, default=list); starter_code: Mapped[dict] = mapped_column(JSON, default=dict); editorial: Mapped[str] = mapped_column(Text, default=''); time_limit_ms: Mapped[int] = mapped_column(Integer, default=4000); created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now()); updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    test_cases: Mapped[list['TestCase']] = relationship(cascade='all, delete-orphan')

class TestCase(Base):
    __tablename__ = 'test_cases'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_value); problem_id: Mapped[str] = mapped_column(ForeignKey('problems.id', ondelete='CASCADE'), index=True); input: Mapped[str] = mapped_column(Text, default=''); expected_output: Mapped[str] = mapped_column(Text); is_hidden: Mapped[bool] = mapped_column(Boolean, default=False); created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class Submission(Base):
    __tablename__ = 'submissions'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_value); user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='CASCADE')); problem_id: Mapped[str] = mapped_column(ForeignKey('problems.id', ondelete='CASCADE')); language: Mapped[str] = mapped_column(String); code: Mapped[str] = mapped_column(Text); verdict: Mapped[SubmissionVerdict] = mapped_column(Enum(SubmissionVerdict)); passed_count: Mapped[int] = mapped_column(Integer, default=0); total_count: Mapped[int] = mapped_column(Integer, default=0); runtime_ms: Mapped[int] = mapped_column(Integer, default=0); test_results: Mapped[list] = mapped_column(JSON, default=list); created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now()); updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    problem: Mapped[Problem] = relationship()

class AIReview(Base):
    __tablename__ = 'ai_reviews'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_value); submission_id: Mapped[str] = mapped_column(ForeignKey('submissions.id', ondelete='CASCADE'), unique=True); user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='CASCADE')); model: Mapped[str|None] = mapped_column(String); time_complexity: Mapped[str|None] = mapped_column(String); space_complexity: Mapped[str|None] = mapped_column(String); code_quality_score: Mapped[int|None] = mapped_column(Integer); strengths: Mapped[list] = mapped_column(JSON, default=list); improvements: Mapped[list] = mapped_column(JSON, default=list); edge_cases_missed: Mapped[list] = mapped_column(JSON, default=list); grounded_verdict: Mapped[SubmissionVerdict|None] = mapped_column(Enum(SubmissionVerdict)); raw: Mapped[dict|None] = mapped_column(JSON); created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now()); updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

class InterviewSession(Base):
    __tablename__ = 'interview_sessions'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_value); user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='CASCADE')); problem_id: Mapped[str|None] = mapped_column(ForeignKey('problems.id', ondelete='SET NULL')); status: Mapped[InterviewStatus] = mapped_column(Enum(InterviewStatus), default=InterviewStatus.active); final_evaluation: Mapped[dict|None] = mapped_column(JSON); created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now()); updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now()); finished_at: Mapped[datetime|None] = mapped_column(DateTime); messages: Mapped[list['InterviewMessage']] = relationship(cascade='all, delete-orphan')
    problem: Mapped[Problem|None] = relationship()

class InterviewMessage(Base):
    __tablename__ = 'interview_messages'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_value); session_id: Mapped[str] = mapped_column(ForeignKey('interview_sessions.id', ondelete='CASCADE'), index=True); role: Mapped[InterviewRole] = mapped_column(Enum(InterviewRole)); content: Mapped[str] = mapped_column(Text); ts: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class KnowledgeChunk(Base):
    __tablename__ = 'knowledge_chunks'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_value); text: Mapped[str] = mapped_column(Text); embedding: Mapped[list] = mapped_column(JSON, default=list); source: Mapped[str|None] = mapped_column(String); title: Mapped[str|None] = mapped_column(String); topics: Mapped[list] = mapped_column(JSON, default=list); companies: Mapped[list] = mapped_column(JSON, default=list); problem_id: Mapped[str|None] = mapped_column(ForeignKey('problems.id', ondelete='SET NULL')); created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now()); updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
