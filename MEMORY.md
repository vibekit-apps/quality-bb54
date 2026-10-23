# MEMORY.md

## App Info
- Subdomain: quality-bb54
- Repo: template/expo
- Created: 2026-10-23T15:26:26.551Z

## Architecture
- Single-screen Expo Router flow in `app/index.tsx` with five staged panels for Video Picker, Quality Enhance, TikTok Studio, Caption Builder, and Export Options.
- Server route `POST /api/caption-suggestions` uses built-in runtime AI when available and falls back to deterministic local copy.

## Known Issues
- Actual video rendering/export remains unimplemented; v1 uses export guidance.
- Device video selection is implemented with `expo-image-picker`, with the native permission prompt.

## Decisions
- Kept the app sign-in free and mobile-first.
- Automatic enhance defaults on; TikTok crop defaults to Original.

## How to Use Memory
- Update this file with important decisions, architecture choices, and lessons
- Daily logs go in `memory/2026-10-23.md` (create memory/ dir if needed)
- Use /compact if context gets long during a session
