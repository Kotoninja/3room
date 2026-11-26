# Issue tracker

For RoomForge, use the active T01–T25 tickets from [TODO.md](../../TODO.md). Legacy IDs remain as historical records. Mark a completed implementation ticket `resolved` after verifying its acceptance criteria.

Issues and specs live under `.scratch/<feature-slug>/`.

- Save the feature spec as `spec.md`.
- Save each ticket as `issues/<NN>-<slug>.md`, starting at `01`.
- Record triage state on a `Status:` line near the top of each ticket. See `triage-labels.md`.
- Append discussion under `## Comments`.

To publish, create the spec or ticket at its conventional path. To fetch, read the referenced path or match the ticket number within the feature directory.

## Wayfinder

- Save the map as `.scratch/<effort>/map.md` and child tickets under `issues/`.
- Record each child's `Type:` as `research`, `prototype`, `grilling`, or `task`. List dependencies on a `Blocked by:` line.
- Pick the lowest-numbered open, unclaimed child whose dependencies are resolved. Set `Status: claimed` before starting.
- To resolve a child, add an `## Answer` section, set `Status: resolved`, and link to it from the map's Decisions-so-far section.
