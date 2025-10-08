# Quran Apps Directory – 1-Page New Features Plan

*Owner: Abubakr Abduraghman, a.abduraghman@itqan.dev*

## Goal
Ship high-impact features that turn the directory from a **read-only catalog** into an **interactive product finder**—all within the next 90 days.

## Who Benefits → User ROI
- **Everyday Users:** find the *right* Qur’an app faster through smarter filters & side-by-side compare.
- **Teachers/Parents:** save curated lists (favorites) to share with students & family.
- **Review Volunteers:** easier workflow to approve or flag apps.
- **Developers:** self-submit apps and view real-time feedback.

## 3 Must-Ship Features (90-day window)
| ⚙ Feature | User Value | Success KPI |
| - | - | - |
| Opinionated Filters 2.0 | Filter by age, ads-free, offline, tajweed level, reciter, language | Search→App CTR +30% |
| Side-by-Side Compare | Compare up to 3 apps on key rubric axes | Time-to-first-good-match < 2 min |
| Favorites & Shareable Lists | Save/ share curated app collections | Saves per active user ≥ 1.5 |

## Enablers (Behind-the-Scenes)
1. **Database Backend (Phase 1)** – migrate app data to PostgreSQL via NestJS API.
2. **Admin Review Dashboard** – track review status & evidence.
3. **Developer Submission Form** – gather metadata + screenshots without code deploys.

## Milestones & Timeline
| Date | Milestone | What’s Done |
| - | - | - |
| Day 0-4 | DB + API live | Apps served from DB, legacy TS file retired |
| Day 5-7 | Filters 2.0 in prod | New filter UI, powered by DB facets |
| Day 8-10 | Compare view | UX + scoring summary, share link |
| Day 11-13 | Favorites MVP | Local storage + shareable slug |
| Day 14-16 | Review dashboard | Volunteer workflow live |
| Day 17-20 | Dev submission beta | Form + moderation queue |

## Risks & Mitigations
- **Scope creep:** lock to 3 user-facing features. → Review weekly.
- **DB performance:** index on language, category, ads-free. → Load test.
- **Volunteer adoption:** unclear workflow. → Build simple Kanban view first.

## Success Scorecard (tracked monthly)
- Search→App CTR +30%
- Time-to-first-good-match < 2 min
- Saves/active user ≥ 1.5
- Accepted reviews/week 15+

## Budget & Resources
- 1 Full-stack dev (4 weeks)
- 1 UX designer (part-time, 2 weeks)
- Volunteer reviewer onboarding kit

---

This one-pager distills the PHASED-ROADMAP into a **30-day, high-impact feature drop** that unlocks interactive discovery and sets the stage for deeper community features.
