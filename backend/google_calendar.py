# ══════════════════════════════════════════════════════════════
# BNZ TASK — Google Calendar Integration (Service Account)
# ══════════════════════════════════════════════════════════════
import os
import json
import logging
from datetime import timedelta
from typing import Optional

from google.oauth2 import service_account
from googleapiclient.discovery import build

logger = logging.getLogger("smarttask.gcal")

SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), 'google-service-account.json')
APP_URL = os.getenv("APP_URL", "https://wonderful-emotion-production-b949.up.railway.app")

# Support loading service account from env var (for Railway/cloud deployment)
_SA_JSON_ENV = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
if _SA_JSON_ENV and not os.path.isfile(SERVICE_ACCOUNT_FILE):
    try:
        with open(SERVICE_ACCOUNT_FILE, 'w') as f:
            f.write(_SA_JSON_ENV)
        logger.info("Created service account file from GOOGLE_SERVICE_ACCOUNT_JSON env var")
    except Exception as e:
        logger.error("Failed to write service account file: %s", e)

# ── Color IDs for Google Calendar ────────────
# 1=Lavender, 2=Sage, 3=Grape, 4=Flamingo, 5=Banana
# 6=Tangerine, 7=Peacock, 8=Graphite, 9=Blueberry, 10=Basil, 11=Tomato
STATUS_COLORS = {
    'todo': '8',         # Graphite
    'in_progress': '9',  # Blueberry
    'blocked': '11',     # Tomato
    'in_review': '5',    # Banana
    'done': '10',        # Basil
}

URGENCY_COLORS = {
    'normal': '7',    # Peacock (blue-green)
    'urgent': '6',    # Tangerine (orange)
    'critical': '11', # Tomato (red)
}


def _is_configured() -> bool:
    """Check if the Google service account JSON file exists."""
    return os.path.isfile(SERVICE_ACCOUNT_FILE)


def _get_service(user_email: str):
    """
    Build a Google Calendar service impersonating the given user.
    Uses domain-wide delegation.
    """
    if not _is_configured():
        logger.warning("Google service account file not found: %s", SERVICE_ACCOUNT_FILE)
        return None
    
    try:
        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE,
            scopes=SCOPES,
            subject=user_email,  # Impersonate this user
        )
        service = build('calendar', 'v3', credentials=credentials, cache_discovery=False)
        return service
    except Exception as e:
        logger.error("Failed to build Google Calendar service for %s: %s", user_email, e)
        return None


# ══════════════════════════════════════════
#  BNZ TASK CALENDAR (dedicated calendar)
# ══════════════════════════════════════════

def get_or_create_bnztask_calendar(user_email: str) -> Optional[str]:
    """
    Find or create a 'BNZ TASK' secondary calendar for the user.
    Returns the calendar ID or None.
    """
    service = _get_service(user_email)
    if not service:
        return None
    
    try:
        # Check if calendar already exists
        calendars = service.calendarList().list().execute()
        for cal in calendars.get('items', []):
            if cal.get('summary') == '📋 BNZ TASK':
                return cal['id']
        
        # Create it
        new_cal = service.calendars().insert(body={
            'summary': '📋 BNZ TASK',
            'description': 'Tâches et signalements synchronisés depuis BNZ TASK',
            'timeZone': 'Europe/Rome',
        }).execute()
        
        # Set color
        service.calendarList().patch(
            calendarId=new_cal['id'],
            body={'backgroundColor': '#4f46e5', 'foregroundColor': '#ffffff'},
            colorRgbFormat=True,
        ).execute()
        
        logger.info("Created BNZ TASK calendar for %s: %s", user_email, new_cal['id'])
        return new_cal['id']
    except Exception as e:
        logger.error("Calendar create/find error for %s: %s", user_email, e)
        return None


# ══════════════════════════════════════════
#  TASK → GOOGLE CALENDAR EVENT
# ══════════════════════════════════════════

def task_to_event(task: dict) -> dict:
    """Convert a BNZ TASK task to a Google Calendar event body."""
    stars = '★' * task.get('importance', 3) + '☆' * (5 - task.get('importance', 3))
    
    description_lines = [
        f"📊 Importance: {stars}",
        f"⏱️ Estimation: {task.get('estimated_hours', 1)}h",
    ]
    if task.get('department_name'):
        description_lines.insert(0, f"🏢 Département: {task['department_name']}")
    if task.get('description'):
        description_lines.append(f"\n📝 {task['description']}")
    if task.get('link'):
        description_lines.append(f"\n🔗 Lien: {task['link']}")
    
    description_lines.append(f"\n— Synchronisé depuis BNZ TASK")
    
    event = {
        'summary': f"📋 {task['title']}",
        'description': '\n'.join(description_lines),
        'colorId': STATUS_COLORS.get(task.get('status', 'todo'), '8'),
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'popup', 'minutes': 60},
                {'method': 'email', 'minutes': 1440},
            ],
        },
        'source': {
            'title': 'BNZ TASK',
            'url': f'{APP_URL}/tasks',
        },
    }
    
    # Set start/end times
    if task.get('deadline'):
        deadline = task['deadline']
        if isinstance(deadline, str):
            from datetime import datetime
            deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
        
        est_hours = float(task.get('estimated_hours', 1) or 1)
        start = deadline - timedelta(hours=est_hours)
        
        event['start'] = {'dateTime': start.isoformat(), 'timeZone': 'Europe/Rome'}
        event['end'] = {'dateTime': deadline.isoformat(), 'timeZone': 'Europe/Rome'}
    else:
        # No deadline → full-day event for today
        from datetime import date
        today = date.today().isoformat()
        event['start'] = {'date': today}
        event['end'] = {'date': today}
    
    return event


def flag_to_event(flag: dict) -> dict:
    """Convert a BNZ TASK flag to a Google Calendar event body."""
    urgency_emoji = {'normal': '🟢', 'urgent': '🟡', 'critical': '🔴'}
    emoji = urgency_emoji.get(flag.get('urgency', 'normal'), '🟢')
    
    description_lines = [
        f"⚠️ Urgence: {flag.get('urgency', 'normal').upper()}",
        f"📝 {flag.get('description', '')}",
    ]
    if flag.get('raiser_name'):
        description_lines.append(f"👤 Signalé par: {flag['raiser_name']}")
    
    description_lines.append(f"\n— Synchronisé depuis BNZ TASK")
    
    event = {
        'summary': f"🚩 {emoji} FLAG: {flag.get('task_title', flag.get('title', 'Signalement'))}",
        'description': '\n'.join(description_lines),
        'colorId': URGENCY_COLORS.get(flag.get('urgency', 'normal'), '7'),
        'reminders': {
            'useDefault': False,
            'overrides': _flag_reminders(flag.get('urgency', 'normal')),
        },
        'source': {
            'title': 'BNZ TASK',
            'url': f'{APP_URL}/flags',
        },
    }
    
    if flag.get('created_at'):
        created = flag['created_at']
        if isinstance(created, str):
            from datetime import datetime
            created = datetime.fromisoformat(created.replace('Z', '+00:00'))
        
        sla_hours = {'normal': 48, 'urgent': 24, 'critical': 4}
        end = created + timedelta(hours=sla_hours.get(flag.get('urgency', 'normal'), 48))
        
        event['start'] = {'dateTime': created.isoformat(), 'timeZone': 'Europe/Rome'}
        event['end'] = {'dateTime': end.isoformat(), 'timeZone': 'Europe/Rome'}
    
    return event


def _flag_reminders(urgency: str) -> list:
    """Smart reminders based on flag urgency."""
    if urgency == 'critical':
        return [
            {'method': 'popup', 'minutes': 5},
            {'method': 'popup', 'minutes': 30},
            {'method': 'email', 'minutes': 60},
        ]
    elif urgency == 'urgent':
        return [
            {'method': 'popup', 'minutes': 30},
            {'method': 'email', 'minutes': 240},
        ]
    else:
        return [
            {'method': 'popup', 'minutes': 60},
            {'method': 'email', 'minutes': 1440},
        ]


# ══════════════════════════════════════════
#  SYNC OPERATIONS
# ══════════════════════════════════════════

def create_calendar_event(user_email: str, event_body: dict) -> Optional[str]:
    """Create an event in the user's BNZ TASK calendar. Returns Google event ID."""
    service = _get_service(user_email)
    if not service:
        return None
    
    cal_id = get_or_create_bnztask_calendar(user_email)
    if not cal_id:
        cal_id = 'primary'
    
    try:
        event = service.events().insert(
            calendarId=cal_id,
            body=event_body,
            sendUpdates='none',
        ).execute()
        logger.info("Created Google event '%s' for %s → %s", event_body.get('summary'), user_email, event['id'])
        return event['id']
    except Exception as e:
        logger.error("Failed to create event for %s: %s", user_email, e)
        return None


def update_calendar_event(user_email: str, google_event_id: str, event_body: dict) -> bool:
    """Update an existing Google Calendar event."""
    service = _get_service(user_email)
    if not service:
        return False
    
    cal_id = get_or_create_bnztask_calendar(user_email)
    if not cal_id:
        cal_id = 'primary'
    
    try:
        service.events().patch(
            calendarId=cal_id,
            eventId=google_event_id,
            body=event_body,
            sendUpdates='none',
        ).execute()
        logger.info("Updated Google event %s for %s", google_event_id, user_email)
        return True
    except Exception as e:
        logger.error("Failed to update event %s: %s", google_event_id, e)
        return False


def delete_calendar_event(user_email: str, google_event_id: str) -> bool:
    """Delete an event from Google Calendar."""
    service = _get_service(user_email)
    if not service:
        return False
    
    cal_id = get_or_create_bnztask_calendar(user_email)
    if not cal_id:
        cal_id = 'primary'
    
    try:
        service.events().delete(
            calendarId=cal_id,
            eventId=google_event_id,
            sendUpdates='none',
        ).execute()
        logger.info("Deleted Google event %s for %s", google_event_id, user_email)
        return True
    except Exception as e:
        logger.error("Failed to delete event %s: %s", google_event_id, e)
        return False
