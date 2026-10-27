"""
Analytics: aggregate issue counts, overall and per department.

GET /api/analytics/summary
  Any logged-in role. Only counts are returned (no titles, reporters or
  locations), so every role sees the whole campus picture, including
  administrators, whose issue *list* is still scoped to their department.

Response:
  {
    "overall":     {"total", "reported", "ongoing", "finished", "high_priority"},
    "departments": [{"id", "name", "total", "reported", "ongoing",
                     "finished", "high_priority"}, ...]   # every department, even with 0 issues
  }

"total" is every issue ever reported. "reported" is the subset still
waiting at the first stage; ongoing/finished are the later stages, so
reported + ongoing + finished == total.
"""

from flask import Blueprint, jsonify
from sqlalchemy import case, func

from app.auth.decorators import load_current_user
from app.db import Department, Issue, IssuePriority, IssueStatus, db_session

bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


def _empty_counts():
    return {"total": 0, "reported": 0, "ongoing": 0, "finished": 0, "high_priority": 0}


@bp.get("/summary")
def summary():
    load_current_user()  # 401 if not logged in

    # One grouped query instead of loading every issue into Python.
    rows = (
        db_session.query(
            Issue.department_id,
            func.count(Issue.issue_id),
            func.sum(case((Issue.status == IssueStatus.reported, 1), else_=0)),
            func.sum(case((Issue.status == IssueStatus.ongoing, 1), else_=0)),
            func.sum(case((Issue.status == IssueStatus.finished, 1), else_=0)),
            func.sum(case((Issue.priority == IssuePriority.high, 1), else_=0)),
        )
        .group_by(Issue.department_id)
        .all()
    )
    counts_by_dept = {
        dept_id: {
            "total": int(total or 0),
            "reported": int(reported or 0),
            "ongoing": int(ongoing or 0),
            "finished": int(finished or 0),
            "high_priority": int(high or 0),
        }
        for dept_id, total, reported, ongoing, finished, high in rows
    }

    overall = _empty_counts()
    departments = []
    for dept in db_session.query(Department).order_by(Department.name).all():
        counts = counts_by_dept.get(dept.department_id, _empty_counts())
        departments.append({"id": str(dept.department_id), "name": dept.name, **counts})
        for key in overall:
            overall[key] += counts[key]

    return jsonify({"overall": overall, "departments": departments})
