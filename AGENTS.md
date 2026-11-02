# Data sources

- Fetch student, drive, assessment, progress and schedule records through backend APIs.
- Do not embed sample identities, companies, completed attempts, scores or dates
  in UI components or silently substitute them after an API failure.
- Show loading, honest empty states, and actionable retry errors. UI labels,
  option enums, rubrics and presentation configuration may remain in code.
- Put private demo fixtures and dumps in the sibling backend's ignored
  `local-demo-data/` folder; never import them into the frontend or `public/`.
