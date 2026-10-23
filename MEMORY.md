# MEMORY.md

## App Info
- Subdomain: quality-bb54
- Repo: template/expo
- Created: 2026-10-23T15:26:26.551Z

## Architecture
- Expo Router flow: `app/index.tsx` is Creator Home/Trends, and `app/studio.tsx` is the five-stage Video Picker, Quality Enhance, TikTok Studio, Caption Builder, and Export Options flow.
- Server route `POST /api/caption-suggestions` uses built-in runtime AI when available and falls back to deterministic local copy.
- TikTok OAuth routes are prepared at `/api/tiktok/connect` and `/api/tiktok/callback`; environment credentials are requested as `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET`.

## Known Issues
- Actual video rendering/export and TikTok direct posting remain unimplemented; v1 uses export guidance and only has connection plumbing.
- Device video selection is implemented with `expo-image-picker`, with the native permission prompt.
- Trend cards are a curated creator playbook, not live TikTok ranking data.

## Decisions
- Kept the app sign-in free and mobile-first.
- Automatic enhance defaults on; TikTok crop defaults to Original.

## How to Use Memory
- Update this file with important decisions, architecture choices, and lessons
- Daily logs go in `memory/2026-10-23.md` (create memory/ dir if needed)
- Use /compact if context gets long during a session
