# Mentor collaboration and drive assessments

Group discussions use selected current mentees; task conversations remain private to the assigned mentor and student. Personal student tasks remain private. Students send work with one Send action; mentor review controls complete or request changes. Placement staff oversight remains read-only.

Drive-name popups reuse assessment rows, with ATS, scorecard, status, readiness, profile and progress actions. Scorecards and popup layouts adapt to phones, tablets and desktop. Descriptions are read from saved records.

The API requires additive migration 0141 and a private persistent `MENTOR_ATTACHMENT_DIR`. New attachment bytes are files; only metadata is stored in PostgreSQL. Do not expose this directory through a static web server. Back up the directory with the database. Legacy attachment migration is performed only after database backup and API verification.

Release intentionally excludes the deferred Master Wizard/admin navigation, unrelated workers and local fixture data.
