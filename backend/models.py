# ══════════════════════════════════════════
# SmartTask Pro — Pydantic Models
# ══════════════════════════════════════════
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


# ── Auth ─────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ── Department ───────────────────────────
class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#3b82f6"
    icon: Optional[str] = "🏢"
    manager_id: Optional[int] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    manager_id: Optional[int] = None


class DepartmentOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    color: str
    icon: str
    manager_id: Optional[int]
    manager_name: Optional[str] = None
    employee_count: Optional[int] = 0
    created_at: Optional[datetime]


# ── User ─────────────────────────────────
class UserCreate(BaseModel):
    email: str
    full_name: str
    password: Optional[str] = "smarttask2025"
    role: Optional[str] = "employee"
    department_id: Optional[int] = None
    daily_capacity: Optional[int] = 8


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    department_id: Optional[int] = None
    daily_capacity: Optional[int] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    avatar_url: Optional[str]
    role: str
    department_id: Optional[int]
    department_name: Optional[str] = None
    daily_capacity: int
    is_active: bool
    created_at: Optional[datetime]


# ── Task ─────────────────────────────────
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    department_id: Optional[int] = None
    assigned_to: Optional[int] = None
    importance: Optional[int] = 3
    estimated_hours: Optional[float] = 1
    deadline: Optional[datetime] = None
    link: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    department_id: Optional[int] = None
    status: Optional[str] = None
    importance: Optional[int] = None
    estimated_hours: Optional[float] = None
    deadline: Optional[datetime] = None
    link: Optional[str] = None


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    department_id: Optional[int]
    department_name: Optional[str] = None
    assigned_to: Optional[int]
    assigned_name: Optional[str] = None
    created_by: int
    creator_name: Optional[str] = None
    status: str
    importance: int
    estimated_hours: float
    deadline: Optional[datetime]
    link: Optional[str] = None
    priority_score: float
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: Optional[datetime]


# ── Flag ─────────────────────────────────
class FlagCreate(BaseModel):
    task_id: Optional[int] = None
    category: Optional[str] = "technical"
    urgency: Optional[str] = "normal"
    description: str
    assigned_to: Optional[int] = None
    detected_by: Optional[int] = None
    link: Optional[str] = None


class FlagUpdate(BaseModel):
    status: Optional[str] = None
    resolution: Optional[str] = None
    resolution_deadline: Optional[datetime] = None
    assigned_to: Optional[int] = None


class FlagOut(BaseModel):
    id: int
    task_id: int
    task_title: Optional[str] = None
    raised_by: int
    raiser_name: Optional[str] = None
    assigned_to: Optional[int]
    assignee_name: Optional[str] = None
    detected_by: Optional[int]
    detected_name: Optional[str] = None
    category: str
    urgency: str
    status: str
    description: str
    resolution: Optional[str]
    link: Optional[str]
    sla_deadline: Optional[datetime]
    resolution_deadline: Optional[datetime]
    created_at: Optional[datetime]

    resolved_at: Optional[datetime]
