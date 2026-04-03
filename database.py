from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./monitor.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class MonitoredSite(Base):
    __tablename__ = "monitored_sites"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    interval_minutes = Column(Integer, default=60)
    alert_email = Column(String, nullable=True)
    status = Column(String, default="active")  # active, paused
    created_at = Column(DateTime, default=datetime.utcnow)
    last_checked = Column(DateTime, nullable=True)
    last_change_type = Column(String, default="none")  # none, minor, major


class Snapshot(Base):
    __tablename__ = "snapshots"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, index=True)
    content = Column(Text)
    content_hash = Column(String)
    change_type = Column(String, default="none")  # none, minor, major
    change_percent = Column(Float, default=0.0)
    change_summary = Column(Text, nullable=True)
    lines_added = Column(Integer, default=0)
    lines_removed = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── CRUD helpers ────────────────────────────────────────────────────

def create_site(db, url: str, name: str, interval_minutes: int, alert_email: str):
    site = MonitoredSite(
        url=url,
        name=name or url,
        interval_minutes=interval_minutes,
        alert_email=alert_email,
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


def get_all_sites(db):
    return db.query(MonitoredSite).all()


def get_site(db, site_id: int):
    return db.query(MonitoredSite).filter(MonitoredSite.id == site_id).first()


def delete_site(db, site_id: int):
    site = get_site(db, site_id)
    if site:
        db.delete(site)
        db.commit()
    return site


def update_site_status(db, site_id: int, status: str):
    site = get_site(db, site_id)
    if site:
        site.status = status
        db.commit()
    return site


def save_snapshot(db, site_id: int, content: str, content_hash: str,
                  change_type: str, change_percent: float, change_summary: str,
                  lines_added: int, lines_removed: int):
    snap = Snapshot(
        site_id=site_id,
        content=content,
        content_hash=content_hash,
        change_type=change_type,
        change_percent=change_percent,
        change_summary=change_summary,
        lines_added=lines_added,
        lines_removed=lines_removed,
    )
    db.add(snap)

    # Update parent site
    site = get_site(db, site_id)
    if site:
        site.last_checked = datetime.utcnow()
        site.last_change_type = change_type

    db.commit()
    db.refresh(snap)
    return snap


def get_last_snapshot(db, site_id: int):
    return (
        db.query(Snapshot)
        .filter(Snapshot.site_id == site_id)
        .order_by(Snapshot.timestamp.desc())
        .first()
    )


def get_snapshots(db, site_id: int, limit: int = 50):
    return (
        db.query(Snapshot)
        .filter(Snapshot.site_id == site_id)
        .order_by(Snapshot.timestamp.desc())
        .limit(limit)
        .all()
    )


def get_snapshot_by_id(db, snapshot_id: int):
    return db.query(Snapshot).filter(Snapshot.id == snapshot_id).first()
