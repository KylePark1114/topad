# topad — top-ad.net 서비스 소개 랜딩

Vercel 이 이 저장소의 **루트를 그대로 서빙**한다. 빌드 단계가 없다.

```
index.html          배포되는 페이지 (빌드 산출물)
assets/             폰트·스크립트 (빌드 산출물) + 구버전 이미지
source/bundle.html  Claude 아티팩트 원본 번들 (편집 대상)
build.js            source/bundle.html → 루트
```

## 카피·디자인을 고칠 때

1. 아티팩트에서 수정 후 새 번들을 내려받아 `source/bundle.html` 교체
2. `node build.js`
3. 커밋·푸시 → Vercel 자동 배포

## 왜 번들을 푸는가

`source/bundle.html` 은 자기추출 번들이다. 본문이 전부 JSON 문자열 안에 있고
JS 가 돌아야 페이지가 생긴다. 그대로 올리면 검색엔진이 읽을 HTML 이 0바이트,
매 방문 9.4MB 다. `build.js` 가 그것을 정적 사이트로 편다.

| | 번들 원본 | 빌드 후 |
|---|---|---|
| 초기 로드 | 9.4 MB | 625 KB |
| 폰트 | 318개 base64 | 개별 .woff2 (필요한 서브셋만) |
| 크롤 HTML | 0 바이트 | 본문 그대로 |
| `<title>` | `Bundled Page` | 실제 제목 + description·OG·canonical |

**빌드를 Vercel 에 맡기지 않는다.** `vercel.json` 의 `buildCommand` 로도,
`dist` + `outputDirectory` 로도 실행되지 않아 원본 번들이 그대로 서빙된 적이
있다. 루트를 완성본으로 두면 설정과 무관하게 올바른 페이지가 나간다.

## 구버전

7월 디자인(`index.html` 42KB + `support.js` + `assets/*.jpg|png`)은 git 이력에
남아 있다. `support.js` 와 구버전 이미지는 현재 페이지가 참조하지 않는다.
