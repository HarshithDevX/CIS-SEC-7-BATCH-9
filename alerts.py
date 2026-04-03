import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)


def send_alert(to_email: str, url: str, diff_result: dict,
               change_type: str, summary: str) -> bool:
    """
    Send an email alert for a detected major change.
    Returns True on success, False on failure.
    """
    if not SMTP_USER or not SMTP_PASS:
        print(f"[ALERT] No SMTP credentials — skipping email to {to_email}")
        print(f"  URL: {url} | Type: {change_type} | {summary}")
        return False

    subject = f"⚠️ MAJOR Change Detected — {url}"

    added_preview   = "\n".join(diff_result["added"][:10])
    removed_preview = "\n".join(diff_result["removed"][:10])

    html_body = f"""
    <html><body style="font-family:Arial,sans-serif;color:#333;">
      <h2 style="color:#e53e3e;">🚨 Website Change Alert</h2>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px;font-weight:bold;">URL</td>
            <td style="padding:8px;"><a href="{url}">{url}</a></td></tr>
        <tr style="background:#f7f7f7;">
            <td style="padding:8px;font-weight:bold;">Change Type</td>
            <td style="padding:8px;color:#e53e3e;font-weight:bold;">{change_type.upper()}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Summary</td>
            <td style="padding:8px;">{summary}</td></tr>
        <tr style="background:#f7f7f7;">
            <td style="padding:8px;font-weight:bold;">Change %</td>
            <td style="padding:8px;">{diff_result['change_percent']}%</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Lines Added</td>
            <td style="padding:8px;color:#38a169;">{diff_result['lines_added']}</td></tr>
        <tr style="background:#f7f7f7;">
            <td style="padding:8px;font-weight:bold;">Lines Removed</td>
            <td style="padding:8px;color:#e53e3e;">{diff_result['lines_removed']}</td></tr>
      </table>

      <h3 style="color:#38a169;">➕ Added Content (preview)</h3>
      <pre style="background:#f0fff4;padding:12px;border-left:4px solid #38a169;">{added_preview or 'None'}</pre>

      <h3 style="color:#e53e3e;">➖ Removed Content (preview)</h3>
      <pre style="background:#fff5f5;padding:12px;border-left:4px solid #e53e3e;">{removed_preview or 'None'}</pre>

      <p style="color:#718096;font-size:12px;">
        Sent by Website Change Detection System
      </p>
    </body></html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        print(f"[ALERT] Email sent to {to_email} for {url}")
        return True
    except Exception as e:
        print(f"[ALERT] Failed to send email: {e}")
        return False
