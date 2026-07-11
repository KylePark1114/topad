# TOPAD Homepage — Vercel 배포 가이드

이 폴더는 별도 빌드 과정 없이 그대로 배포 가능한 정적 사이트입니다.

## 배포 방법

1. 이 `deploy` 폴더 전체를 GitHub 리포지토리 루트에 올립니다.
   (또는 리포지토리 루트를 이 폴더 내용으로 그대로 구성)
2. Vercel에서 "New Project" → 해당 GitHub 리포지토리 선택
3. Framework Preset: **Other** (빌드 명령 없음, Build Command 비워두기)
4. Output Directory: `.` (루트, 기본값 그대로)
5. Deploy 클릭 — 끝

## 구성

- `index.html` — 페이지 전체 (마크업 + 로직)
- `support.js` — 렌더링 런타임 (React/Babel을 CDN에서 자동 로드)
- `assets/` — 로고, 스크린샷, 후기 이미지 등

## 참고

- 카카오톡 상담 링크는 Tweaks 패널의 `kakaoUrl` 값으로 관리됩니다. 링크를 바꾸려면 `index.html` 안 `data-props`의 `kakaoUrl` 기본값을 직접 수정하세요.
- 외부 폰트(Archivo, IBM Plex Mono, Pretendard)와 React/Babel은 CDN에서 로드되므로 배포 후에도 인터넷 연결이 필요합니다.
