import html
import json
from datetime import datetime
from urllib.request import Request, urlopen

from app.schemas.workspace_schema import TenantUserInput
from app.utils.config import settings


def send_workspace_email(
    user: TenantUserInput,
    client_name: str,
    project_name: str,
    client_id: str,
    project_id: str,
    project_key: str,
) -> None:
    if not settings.SENDGRID_API_KEY:
        raise RuntimeError("SENDGRID_API_KEY is not configured")

    esc = lambda value: html.escape(str(value), quote=True)
    dashboard_url = f"{settings.CLIENT_DASHBOARD_BASE_URL.rstrip('/')}/{project_id}"
    email_html = f"""
    <html><body style="font-family:Arial,sans-serif;background:#f7f9fc;padding:20px">
      <div style="max-width:650px;margin:auto;background:#fff;border-radius:10px;padding:25px">
        <div style="text-align:center;margin-bottom:30px"><img src="{esc(settings.EMAIL_LOGO_URL)}" alt="Nexora" style="width:180px"></div>
        <h2>Hello {esc(user.name)},</h2>
        <p>Welcome to <strong>Nexora</strong>. Your workspace and login have been created for {esc(client_name)}.</p>
        <h3>Project details</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><th style="padding:8px;border:1px solid #ddd">Name</th><th style="padding:8px;border:1px solid #ddd">Client ID</th><th style="padding:8px;border:1px solid #ddd">Project ID</th><th style="padding:8px;border:1px solid #ddd">Project Key</th></tr>
          <tr><td style="padding:8px;border:1px solid #ddd">{esc(project_name)}</td><td style="padding:8px;border:1px solid #ddd">{esc(client_id)}</td><td style="padding:8px;border:1px solid #ddd">{esc(project_id)}</td><td style="padding:8px;border:1px solid #ddd">{esc(project_key)}</td></tr>
        </table>
        <h3>Login credentials</h3>
        <p><strong>Username:</strong> {esc(user.email)}<br><strong>Temporary password:</strong> {esc(user.password)}<br><strong>Dashboard:</strong> <a href="{esc(dashboard_url)}">{esc(dashboard_url)}</a></p>
        <p>Please change your temporary password after signing in.</p>
        <p>For support, contact <a href="mailto:techsupport@usenexora.com">techsupport@usenexora.com</a>.</p>
        <p>Regards,<br><strong>Nexora Team</strong></p>
        <div style="font-size:12px;color:#999;text-align:center">© {datetime.now().year} Nexora</div>
      </div>
    </body></html>
    """
    body = json.dumps({
        "personalizations": [{"to": [{"email": user.email, "name": user.name}]}],
        "from": {"email": settings.EMAIL_FROM_ADDRESS, "name": settings.EMAIL_FROM_NAME},
        "subject": "Your Nexora Client, Project & Login Credentials",
        "content": [{"type": "text/html", "value": email_html}],
    }).encode()
    request = Request(
        "https://api.sendgrid.com/v3/mail/send", data=body, method="POST",
        headers={"Authorization": f"Bearer {settings.SENDGRID_API_KEY}", "Content-Type": "application/json"},
    )
    with urlopen(request, timeout=20) as response:
        if response.status not in (200, 202):
            raise RuntimeError(f"SendGrid returned HTTP {response.status}")
