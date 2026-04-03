import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import (
    init_db, get_db,
    create_site, get_all_sites, get_site, delete_site, update_site_status,
    get_snapshots, get_snapshot_by_id, get_last_snapshot,
)
from scheduler import add_site_job, remove_site_job, trigger_now, start_scheduler, stop_scheduler
from diff_engine import compute_diff


# ─── Pydantic schemas ────────────────────────────────────────────────

class SiteCreate(BaseModel):
    url: str
    name: Optional[str] = None
    interval_minutes: int = 60
    alert_email: Optional[str] = None


class SiteUpdate(BaseModel):
    status: Optional[str] = None          # active | paused
    interval_minutes: Optional[int] = None


# ─── Lifespan ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield
    stop_scheduler()


# ─── App ─────────────────────────────────────────────────────────────

app = FastAPI(title="Website Change Detector API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Sites ───────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Website Change Detection API is running 🚀"}


@app.post("/sites", status_code=201)
def add_site(payload: SiteCreate, db: Session = Depends(get_db)):
    existing = db.query(__import__("database").MonitoredSite).filter_by(url=payload.url).first()
    if existing:
        raise HTTPException(status_code=400, detail="URL is already being monitored.")

    site = create_site(
        db,
        url=payload.url,
        name=payload.name,
        interval_minutes=payload.interval_minutes,
        alert_email=payload.alert_email,
    )
    add_site_job(site.id, site.interval_minutes)

    # Immediately take first snapshot
    trigger_now(site.id)

    return {"message": "Site added and initial snapshot taken.", "site_id": site.id}


@app.get("/sites")
def list_sites(db: Session = Depends(get_db)):
    sites = get_all_sites(db)
    return [
        {
            "id": s.id,
            "url": s.url,
            "name": s.name,
            "interval_minutes": s.interval_minutes,
            "alert_email": s.alert_email,
            "status": s.status,
            "last_checked": s.last_checked,
            "last_change_type": s.last_change_type,
            "created_at": s.created_at,
        }
        for s in sites
    ]


@app.get("/sites/{site_id}")
def get_site_detail(site_id: int, db: Session = Depends(get_db)):
    site = get_site(db, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found.")
    return site


@app.patch("/sites/{site_id}")
def update_site(site_id: int, payload: SiteUpdate, db: Session = Depends(get_db)):
    site = get_site(db, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found.")

    if payload.status is not None:
        update_site_status(db, site_id, payload.status)
        if payload.status == "paused":
            remove_site_job(site_id)
        elif payload.status == "active":
            add_site_job(site_id, site.interval_minutes)

    if payload.interval_minutes is not None:
        site.interval_minutes = payload.interval_minutes
        db.commit()
        if site.status == "active":
            add_site_job(site_id, payload.interval_minutes)

    return {"message": "Site updated."}


@app.delete("/sites/{site_id}")
def remove_site(site_id: int, db: Session = Depends(get_db)):
    site = delete_site(db, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found.")
    remove_site_job(site_id)
    return {"message": "Site removed."}


@app.post("/sites/{site_id}/check")
def manual_check(site_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    site = get_site(db, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found.")
    background_tasks.add_task(trigger_now, site_id)
    return {"message": "Manual check triggered. Refresh in a few seconds."}


# ─── Snapshots / History ─────────────────────────────────────────────

@app.get("/sites/{site_id}/history")
def get_history(site_id: int, limit: int = 30, db: Session = Depends(get_db)):
    snaps = get_snapshots(db, site_id, limit=limit)
    return [
        {
            "id": s.id,
            "timestamp": s.timestamp,
            "change_type": s.change_type,
            "change_percent": s.change_percent,
            "change_summary": s.change_summary,
            "lines_added": s.lines_added,
            "lines_removed": s.lines_removed,
            "content_hash": s.content_hash,
        }
        for s in snaps
    ]


@app.get("/sites/{site_id}/diff/latest")
def latest_diff(site_id: int, db: Session = Depends(get_db)):
    snaps = get_snapshots(db, site_id, limit=2)
    if len(snaps) < 2:
        return {"message": "Not enough snapshots yet.", "diff": None}
    new_snap, old_snap = snaps[0], snaps[1]
    diff = compute_diff(old_snap.content, new_snap.content)
    return {
        "old_snapshot_id": old_snap.id,
        "new_snapshot_id": new_snap.id,
        "old_timestamp": old_snap.timestamp,
        "new_timestamp": new_snap.timestamp,
        "change_type": new_snap.change_type,
        "change_summary": new_snap.change_summary,
        "diff": {
            "change_percent": diff["change_percent"],
            "lines_added": diff["lines_added"],
            "lines_removed": diff["lines_removed"],
            "added": diff["added"][:50],
            "removed": diff["removed"][:50],
            "blocks": diff["blocks"][:30],
        },
    }


@app.get("/sites/{site_id}/diff/{snap_id_a}/{snap_id_b}")
def compare_snapshots(site_id: int, snap_id_a: int, snap_id_b: int,
                      db: Session = Depends(get_db)):
    snap_a = get_snapshot_by_id(db, snap_id_a)
    snap_b = get_snapshot_by_id(db, snap_id_b)

    if not snap_a or not snap_b:
        raise HTTPException(status_code=404, detail="One or both snapshots not found.")

    diff = compute_diff(snap_a.content, snap_b.content)
    return {
        "snapshot_a": {"id": snap_a.id, "timestamp": snap_a.timestamp},
        "snapshot_b": {"id": snap_b.id, "timestamp": snap_b.timestamp},
        "diff": {
            "change_percent": diff["change_percent"],
            "lines_added": diff["lines_added"],
            "lines_removed": diff["lines_removed"],
            "added": diff["added"][:100],
            "removed": diff["removed"][:100],
            "blocks": diff["blocks"][:50],
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
