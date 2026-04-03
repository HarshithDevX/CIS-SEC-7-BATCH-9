from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from database import SessionLocal, get_last_snapshot, save_snapshot, get_all_sites, get_site
from scraper import fetch_content
from diff_engine import compute_diff
from classifier import classify_change
from alerts import send_alert

scheduler = BackgroundScheduler(timezone="UTC")


def _monitor_job(site_id: int):
    """Core monitoring job — called by the scheduler."""
    db: Session = SessionLocal()
    try:
        site = get_site(db, site_id)
        if not site or site.status != "active":
            return

        print(f"[SCHEDULER] Checking {site.url} ...")

        # 1. Fetch
        try:
            new_text, new_hash = fetch_content(site.url)
        except Exception as e:
            print(f"[SCHEDULER] Fetch error for {site.url}: {e}")
            return

        # 2. Compare
        last = get_last_snapshot(db, site_id)

        if last is None:
            # First snapshot
            save_snapshot(
                db, site_id, new_text, new_hash,
                change_type="none", change_percent=0.0,
                change_summary="Initial snapshot captured.",
                lines_added=0, lines_removed=0,
            )
            print(f"[SCHEDULER] Initial snapshot saved for {site.url}")
            return

        if last.content_hash == new_hash:
            print(f"[SCHEDULER] No change for {site.url}")
            # Still update last_checked
            from datetime import datetime
            site.last_checked = datetime.utcnow()
            db.commit()
            return

        # 3. Diff
        diff_result = compute_diff(last.content, new_text)

        # 4. Classify
        change_type, summary = classify_change(site.url, diff_result)

        # 5. Save
        save_snapshot(
            db, site_id, new_text, new_hash,
            change_type=change_type,
            change_percent=diff_result["change_percent"],
            change_summary=summary,
            lines_added=diff_result["lines_added"],
            lines_removed=diff_result["lines_removed"],
        )

        print(f"[SCHEDULER] {change_type.upper()} change on {site.url}: {summary}")

        # 6. Alert
        if change_type == "major" and site.alert_email:
            send_alert(site.alert_email, site.url, diff_result, change_type, summary)

    finally:
        db.close()


def add_site_job(site_id: int, interval_minutes: int):
    """Register a monitoring job for a site."""
    job_id = f"site_{site_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    scheduler.add_job(
        _monitor_job,
        trigger=IntervalTrigger(minutes=interval_minutes),
        args=[site_id],
        id=job_id,
        replace_existing=True,
        misfire_grace_time=60,
    )
    print(f"[SCHEDULER] Job added: site {site_id} every {interval_minutes}m")


def remove_site_job(site_id: int):
    job_id = f"site_{site_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        print(f"[SCHEDULER] Job removed for site {site_id}")


def trigger_now(site_id: int):
    """Run the monitor job immediately (for manual check)."""
    _monitor_job(site_id)


def start_scheduler():
    """Start scheduler and reload all active site jobs from DB."""
    scheduler.start()
    db = SessionLocal()
    try:
        sites = get_all_sites(db)
        for site in sites:
            if site.status == "active":
                add_site_job(site.id, site.interval_minutes)
    finally:
        db.close()
    print(f"[SCHEDULER] Started with {len([s for s in sites if s.status=='active'])} active sites.")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
