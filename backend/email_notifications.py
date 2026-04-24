# ══════════════════════════════════════════════════════════════
# SmartTask Pro — Email Notifications (Gmail API + SMTP fallback)
# ══════════════════════════════════════════════════════════════
import os
import logging
import base64
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import threading

logger = logging.getLogger("smarttask.email")

SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), 'google-service-account.json')
SENDER_EMAIL = os.getenv("SMTP_SENDER", "wiem.hsairi@benozzi.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
APP_URL = os.getenv("APP_URL", "https://wonderful-emotion-production-b949.up.railway.app")

# Support loading service account from env var (for Railway/cloud deployment)
_SA_JSON_ENV = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
if _SA_JSON_ENV and not os.path.isfile(SERVICE_ACCOUNT_FILE):
    try:
        with open(SERVICE_ACCOUNT_FILE, 'w') as f:
            f.write(_SA_JSON_ENV)
        logger.info("Created service account file from env var for email")
    except Exception as e:
        logger.error("Failed to write service account file: %s", e)


def _send_via_gmail_api(to_email: str, subject: str, html_body: str) -> bool:
    """Try sending via Gmail API (Service Account delegation)."""
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        if not os.path.isfile(SERVICE_ACCOUNT_FILE):
            return False

        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE,
            scopes=['https://www.googleapis.com/auth/gmail.send'],
            subject=SENDER_EMAIL,
        )
        service = build('gmail', 'v1', credentials=credentials, cache_discovery=False)

        msg = MIMEMultipart('alternative')
        msg['To'] = to_email
        msg['From'] = f"SmartTask Pro <{SENDER_EMAIL}>"
        msg['Subject'] = subject
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        service.users().messages().send(userId='me', body={'raw': raw}).execute()
        logger.info("Email sent via Gmail API to %s", to_email)
        return True
    except Exception as e:
        logger.warning("Gmail API failed, trying SMTP: %s", e)
        return False


def _send_via_smtp(to_email: str, subject: str, html_body: str) -> bool:
    """Send via SMTP (Google Workspace / Gmail App Password)."""
    if not SMTP_PASSWORD:
        logger.error("No SMTP_PASSWORD configured in .env - cannot send email")
        return False
    try:
        msg = MIMEMultipart('alternative')
        msg['To'] = to_email
        msg['From'] = f"SmartTask Pro <{SENDER_EMAIL}>"
        msg['Subject'] = subject
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Email sent via SMTP to %s", to_email)
        return True
    except Exception as e:
        logger.error("SMTP failed to %s: %s", to_email, e)
        return False


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send email - tries Gmail API first, falls back to SMTP."""
    if _send_via_gmail_api(to_email, subject, html_body):
        return True
    return _send_via_smtp(to_email, subject, html_body)


def send_email_async(to_email: str, subject: str, html_body: str):
    """Non-blocking email send in background thread."""
    threading.Thread(target=_send_email, args=(to_email, subject, html_body), daemon=True).start()


# ══════════════════════════════════════════
#  EMAIL TEMPLATES (100% inline - Gmail compatible)
# ══════════════════════════════════════════

def _btn(href, text, bg_color="#4f46e5"):
    """Gmail-proof button using table-based approach."""
    return f'''
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;">
      <tr>
        <td align="center" style="border-radius:8px; background:{bg_color}; padding:14px 32px;">
          <a href="{href}" target="_blank"
             style="font-family:Arial,sans-serif; font-size:15px; font-weight:700;
                    text-decoration:none; display:inline-block;">
            <span style="color:#ffffff;">{text}</span>
          </a>
        </td>
      </tr>
    </table>
    '''


def _wrap(header_bg, title, subtitle, body_html):
    """Wrap content in the email shell."""
    return f'''
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0; padding:0; background-color:#f0f2f5; font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2f5; padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff; border-radius:12px; overflow:hidden;">
          <tr>
            <td style="background:{header_bg}; padding:28px 32px;">
              <p style="margin:0; font-size:22px; color:#ffffff; font-weight:700; font-family:Arial,sans-serif;">{title}</p>
              <p style="margin:6px 0 0; font-size:13px; color:rgba(255,255,255,0.85); font-family:Arial,sans-serif;">{subtitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px; background:#f9fafb; text-align:center; border-top:1px solid #e5e7eb;">
              <p style="margin:0; font-size:12px; color:#9ca3af; font-family:Arial,sans-serif;">
                Cet email a ete envoye automatiquement par SmartTask Pro
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
    </body></html>
    '''


def notify_task_assigned(to_email: str, to_name: str, task: dict, assigner_name: str):
    """Send email notification for task assignment."""
    importance = int(task.get('importance', 3))
    stars = ''
    for i in range(5):
        c = '#f59e0b' if i < importance else '#d1d5db'
        stars += f'<span style="color:{c}; font-size:18px;">&#9733;</span>'

    deadline = task.get('deadline', '')
    if deadline and hasattr(deadline, 'strftime'):
        deadline = deadline.strftime('%d/%m/%Y %H:%M')

    body = f'''
    <p style="margin:0 0 8px; font-size:15px; color:#374151;">Bonjour <strong>{to_name}</strong>,</p>
    <p style="margin:0 0 24px; font-size:15px; color:#374151;"><strong>{assigner_name}</strong> vous a assigne une nouvelle tache :</p>

    <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700; letter-spacing:0.5px;">Titre</p>
    <p style="margin:0 0 20px; font-size:20px; font-weight:700; color:#4f46e5;">{task.get('title', '')}</p>

    <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700; letter-spacing:0.5px;">Description</p>
    <p style="margin:0 0 24px; font-size:15px; color:#374151; line-height:1.5;">{task.get('description', 'Aucune description')}</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:8px;">
      <tr>
        <td width="33%" style="padding:12px 16px; background:#f9fafb; border-radius:8px 0 0 8px;">
          <p style="margin:0 0 4px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700;">Importance</p>
          <p style="margin:0;">{stars}</p>
        </td>
        <td width="34%" style="padding:12px 16px; background:#f9fafb; border-left:3px solid #ffffff;">
          <p style="margin:0 0 4px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700;">Estimation</p>
          <p style="margin:0; font-size:16px; font-weight:600; color:#374151;">{task.get('estimated_hours', 1)}h</p>
        </td>
        <td width="33%" style="padding:12px 16px; background:#f9fafb; border-radius:0 8px 8px 0; border-left:3px solid #ffffff;">
          <p style="margin:0 0 4px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700;">Deadline</p>
          <p style="margin:0; font-size:16px; font-weight:700; color:#ef4444;">{deadline or 'Non definie'}</p>
        </td>
      </tr>
    </table>

    {_btn(f"{APP_URL}/tasks", "&#10140;&nbsp;&nbsp;Voir dans SmartTask Pro")}
    '''

    subject = f"Nouvelle tache : {task.get('title', '')}"
    html = _wrap("linear-gradient(135deg, #4f46e5, #7c3aed)", "&#128203; Nouvelle Tache Assignee", "SmartTask Pro", body)
    send_email_async(to_email, subject, html)


def notify_flag_assigned(to_email: str, to_name: str, flag: dict, raiser_name: str):
    """Send email notification for flag assignment."""
    urgency = flag.get('urgency', 'normal')
    urgency_colors = {'normal': '#10b981', 'urgent': '#f59e0b', 'critical': '#ef4444'}
    urgency_labels = {'normal': 'Normal (48h)', 'urgent': 'Urgent (24h)', 'critical': 'Critique (4h)'}
    color = urgency_colors.get(urgency, '#10b981')
    header_bg = '#ef4444' if urgency == 'critical' else '#f59e0b' if urgency == 'urgent' else '#3b82f6'

    task_row = ''
    if flag.get('task_title'):
        task_row = f'''
        <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700;">Tache concernee</p>
        <p style="margin:0 0 20px; font-size:15px; color:#374151;">{flag.get("task_title", "")}</p>
        '''

    body = f'''
    <p style="margin:0 0 8px; font-size:15px; color:#374151;">Bonjour <strong>{to_name}</strong>,</p>
    <p style="margin:0 0 24px; font-size:15px; color:#374151;"><strong>{raiser_name}</strong> vous a assigne un signalement :</p>

    <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700;">Urgence</p>
    <p style="margin:0 0 20px;">
      <span style="display:inline-block; padding:5px 16px; border-radius:20px; font-size:13px; font-weight:700; color:#ffffff; background:{color};">
        {urgency_labels.get(urgency, urgency)}
      </span>
    </p>

    <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700;">Probleme</p>
    <p style="margin:0 0 20px; font-size:16px; color:#1f2937; line-height:1.5; padding:14px 16px; background:#fef2f2; border-left:4px solid {color}; border-radius:0 8px 8px 0;">
      {flag.get('description', '')}
    </p>

    {task_row}

    {_btn(f"{APP_URL}/flags", "&#10140;&nbsp;&nbsp;Voir dans SmartTask Pro", header_bg)}
    '''

    subject = f"{'CRITIQUE - ' if urgency == 'critical' else 'URGENT - ' if urgency == 'urgent' else ''}Signalement : {flag.get('task_title', flag.get('description', 'Nouveau probleme'))[:50]}"
    html = _wrap(f"linear-gradient(135deg, {header_bg}, #1e1e2e)", "&#128681; Signalement Assigne", "SmartTask Pro - Action requise", body)
    send_email_async(to_email, subject, html)


def notify_task_status_changed(to_email: str, to_name: str, task: dict, changer_name: str, old_status: str, new_status: str):
    """Send email when task status changes."""
    status_labels = {'todo': 'A faire', 'in_progress': 'En cours', 'blocked': 'Bloque', 'in_review': 'En revision', 'done': 'Termine'}
    status_colors = {'todo': '#6b7280', 'in_progress': '#3b82f6', 'blocked': '#ef4444', 'in_review': '#f59e0b', 'done': '#10b981'}
    old_color = status_colors.get(old_status, '#6b7280')
    new_color = status_colors.get(new_status, '#6b7280')

    body = f'''
    <p style="margin:0 0 8px; font-size:15px; color:#374151;">Bonjour <strong>{to_name}</strong>,</p>
    <p style="margin:0 0 24px; font-size:15px; color:#374151;">Le statut de votre tache a ete modifie par <strong>{changer_name}</strong> :</p>

    <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700;">Tache</p>
    <p style="margin:0 0 24px; font-size:18px; font-weight:700; color:#1f2937;">{task.get('title', '')}</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding:20px; background:#f9fafb; border-radius:12px;">
          <span style="display:inline-block; padding:6px 18px; border-radius:20px; font-size:14px; font-weight:700; color:#ffffff; background:{old_color};">
            {status_labels.get(old_status, old_status)}
          </span>
          <span style="display:inline-block; margin:0 16px; font-size:24px; color:#9ca3af;">&#10132;</span>
          <span style="display:inline-block; padding:6px 18px; border-radius:20px; font-size:14px; font-weight:700; color:#ffffff; background:{new_color};">
            {status_labels.get(new_status, new_status)}
          </span>
        </td>
      </tr>
    </table>

    {_btn(f"{APP_URL}/tasks", "&#10140;&nbsp;&nbsp;Voir dans SmartTask Pro")}
    '''

    subject = f"Tache mise a jour : {task.get('title', '')}"
    html = _wrap(f"linear-gradient(135deg, {new_color}, #1e1e2e)", "&#128203; Statut Modifie", "SmartTask Pro", body)
    send_email_async(to_email, subject, html)


def notify_flag_status_changed(to_email: str, to_name: str, flag: dict, changer_name: str, old_status: str, new_status: str):
    """Send email when flag status changes."""
    status_labels = {'open': 'Ouvert', 'in_progress': 'En cours', 'resolved': 'Resolu', 'closed': 'Ferme'}
    status_colors = {'open': '#ef4444', 'in_progress': '#3b82f6', 'resolved': '#10b981', 'closed': '#6b7280'}
    old_color = status_colors.get(old_status, '#6b7280')
    new_color = status_colors.get(new_status, '#6b7280')

    urgency = flag.get('urgency', 'normal')
    urgency_labels = {'normal': 'Normal', 'urgent': 'Urgent', 'critical': 'Critique'}
    urgency_colors = {'normal': '#10b981', 'urgent': '#f59e0b', 'critical': '#ef4444'}

    body = f'''
    <p style="margin:0 0 8px; font-size:15px; color:#374151;">Bonjour <strong>{to_name}</strong>,</p>
    <p style="margin:0 0 24px; font-size:15px; color:#374151;">Le statut d'un signalement a ete modifie par <strong>{changer_name}</strong> :</p>

    <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700;">Urgence</p>
    <p style="margin:0 0 16px;">
      <span style="display:inline-block; padding:4px 14px; border-radius:20px; font-size:12px; font-weight:700; color:#ffffff; background:{urgency_colors.get(urgency, '#6b7280')};">
        {urgency_labels.get(urgency, urgency)}
      </span>
    </p>

    <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700;">Probleme</p>
    <p style="margin:0 0 24px; font-size:15px; color:#374151; padding:12px 16px; background:#f9fafb; border-left:4px solid {urgency_colors.get(urgency, '#6b7280')}; border-radius:0 8px 8px 0;">
      {flag.get('description', '')}
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding:20px; background:#f9fafb; border-radius:12px;">
          <span style="display:inline-block; padding:6px 18px; border-radius:20px; font-size:14px; font-weight:700; color:#ffffff; background:{old_color};">
            {status_labels.get(old_status, old_status)}
          </span>
          <span style="display:inline-block; margin:0 16px; font-size:24px; color:#9ca3af;">&#10132;</span>
          <span style="display:inline-block; padding:6px 18px; border-radius:20px; font-size:14px; font-weight:700; color:#ffffff; background:{new_color};">
            {status_labels.get(new_status, new_status)}
          </span>
        </td>
      </tr>
    </table>

    {_btn(f"{APP_URL}/flags", "&#10140;&nbsp;&nbsp;Voir dans SmartTask Pro", new_color)}
    '''

    subject = f"Signalement mis a jour : {flag.get('description', '')[:50]}"
    html = _wrap(f"linear-gradient(135deg, {new_color}, #1e1e2e)", "&#128681; Signalement Modifie", "SmartTask Pro", body)
    send_email_async(to_email, subject, html)


def notify_task_overdue(to_email: str, to_name: str, task: dict, days_overdue: int):
    """Send reminder email when task deadline has passed."""
    deadline = task.get('deadline', '')
    if deadline and hasattr(deadline, 'strftime'):
        deadline = deadline.strftime('%d/%m/%Y %H:%M')

    body = f'''
    <p style="margin:0 0 8px; font-size:15px; color:#374151;">Bonjour <strong>{to_name}</strong>,</p>
    <p style="margin:0 0 24px; font-size:15px; color:#374151;">Vous avez une tache en retard qui necessite votre attention :</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:16px; background:#fef2f2; border-left:4px solid #ef4444; border-radius:0 12px 12px 0;">
          <p style="margin:0 0 4px; font-size:11px; text-transform:uppercase; color:#ef4444; font-weight:700;">⚠ RETARD DE {days_overdue} JOUR{"S" if days_overdue > 1 else ""}</p>
          <p style="margin:0; font-size:18px; font-weight:700; color:#1f2937;">{task.get('title', '')}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700;">Description</p>
    <p style="margin:0 0 20px; font-size:15px; color:#374151; line-height:1.5;">{task.get('description', 'Aucune description')}</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:8px;">
      <tr>
        <td width="50%" style="padding:12px 16px; background:#fef2f2; border-radius:8px 0 0 8px;">
          <p style="margin:0 0 4px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700;">Deadline originale</p>
          <p style="margin:0; font-size:16px; font-weight:700; color:#ef4444;">{deadline or 'Non definie'}</p>
        </td>
        <td width="50%" style="padding:12px 16px; background:#fef2f2; border-radius:0 8px 8px 0; border-left:3px solid #ffffff;">
          <p style="margin:0 0 4px; font-size:11px; text-transform:uppercase; color:#9ca3af; font-weight:700;">Statut actuel</p>
          <p style="margin:0; font-size:16px; font-weight:600; color:#f59e0b;">{task.get('status', 'todo').replace('_', ' ').title()}</p>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0; font-size:14px; color:#6b7280; font-style:italic;">
      Merci de mettre a jour le statut de cette tache ou de contacter votre responsable.
    </p>

    {_btn(f"{APP_URL}/tasks", "&#10140;&nbsp;&nbsp;Voir dans SmartTask Pro", "#ef4444")}
    '''

    subject = f"⚠ RAPPEL : Tache en retard - {task.get('title', '')}"
    html = _wrap("linear-gradient(135deg, #ef4444, #991b1b)", "⏰ Rappel — Deadline Depassee", "SmartTask Pro - Action urgente", body)
    send_email_async(to_email, subject, html)
