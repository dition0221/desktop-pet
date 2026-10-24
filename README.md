# desktop-pet

### 바탕화면을 돌아다니는 데스크탑 펫이자, 채팅으로 물으면 캐릭터 목소리로 대답해주는 개인 비서 앱

App : <img src="https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white"/> <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=white"/> <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white"/> <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white"/> <img src="https://img.shields.io/badge/Tailwind CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white"/> <img src="https://img.shields.io/badge/Jotai-000?style=flat-square&logoColor=white"/> <img src="https://img.shields.io/badge/TanStack Query-FF4154?style=flat-square&logo=reactquery&logoColor=white"/> <img src="https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white"/>  
Tooling : <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white"/> <img src="https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white"/> <img src="https://img.shields.io/badge/Biome-60A5FA?style=flat-square&logo=biome&logoColor=white"/> <img src="https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white"/> <img src="https://img.shields.io/badge/electron&dash;builder-000?style=flat-square&logoColor=white"/>  
AI / Voice : <img src="https://img.shields.io/badge/Google Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white"/> <img src="https://img.shields.io/badge/Claude-D97757?style=flat-square&logo=claude&logoColor=white"/> <img src="https://img.shields.io/badge/GPT&dash;SoVITS-000?style=flat-square&logoColor=white"/> <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white"/>  
Data : <img src="https://img.shields.io/badge/공공데이터포털-0066CC?style=flat-square&logoColor=white"/> 대전광역시 버스 API

> 🚧 개발 초기 단계 — 진행 상황은 [docs/ROADMAP.md](./docs/ROADMAP.md) 참고

<!-- TODO: v0.1 이후 데모 GIF 추가 -->

---

## 무엇을 하는 앱인가

- **펫**: 투명 창 위에서 캐릭터가 화면을 걸어다니고, 클릭·드래그에 반응한다.
- **펫 팩**: 캐릭터의 스프라이트·성격(프롬프트)·목소리를 하나의 팩으로 묶어 추가/교체할 수 있다.
- **위젯**: 대전광역시 실시간 버스 도착 정보를 보여주고, 곧 도착하면 펫이 말풍선으로 알려준다.
- **비서**: 펫에게 채팅으로 질문하면 LLM이 캐릭터 말투로 답하고, 학습한 캐릭터 목소리(TTS)로 읽어준다.

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 데스크탑 | Electron + electron-vite, electron-builder (Windows 설치 파일) |
| UI | React, TypeScript, Tailwind CSS |
| 상태 / 데이터 | Jotai (화면 상태), TanStack Query (메인 프로세스가 가져온 데이터의 조회·캐시), Zod (API 응답·펫 팩 스키마 검증) |
| 개발 도구 | pnpm, Biome (린트 + 포맷), Vitest |
| LLM | Gemini (기본, 무료 티어) / Claude — 사용자 본인 API 키 |
| TTS | GPT-SoVITS — 로컬 Python API 서버 (앱에 포함하지 않음, 없으면 말풍선만 표시) |
| 공공 데이터 | 공공데이터포털 대전광역시 버스 API — 사용자 본인 API 키 |

## 시작하기

> Phase 0(프로젝트 셋업) 완료 후 확정됩니다.

**필요 환경**: Windows 10 이상, Node.js 24+, pnpm 10

```bash
pnpm install
pnpm dev
```

**API 키** (앱의 설정 페이지에서 입력, 사용자 PC에만 암호화 저장)
- AI 대화: [Google AI Studio](https://aistudio.google.com/)에서 Gemini API 키 발급 (무료) 또는 Claude API 키
- 대전 버스: [공공데이터포털](https://www.data.go.kr/)에서 대전광역시 버스 정류소·도착정보 API를 각각 활용신청 → **Decoding 키** 사용

## 구조 (예정)

```
desktop-pet/
├─ src/
│  ├─ main/       # Electron 메인 프로세스 (창 관리, 펫 상태, 외부 API 호출, TTS 서버 관리)
│  ├─ preload/    # 메인 ↔ 렌더러 브리지 (기능 단위 API만 노출)
│  └─ renderer/   # React UI (펫 오버레이 창, 메인 창)
├─ packs/         # 개발용 펫 팩 (로컬 전용, _example 만 저장소에 포함)
├─ voice/         # 음성 데이터 파이프라인 스크립트 (데이터·대사·모델은 로컬 전용)
└─ docs/          # 기획·로드맵 문서
```

## 브랜치 전략

- `main` — 배포 가능한 안정 버전 (릴리스 태그)
- `develop` — 개발 기본 브랜치 (default)
- `feature/*` — 기능 단위 작업 후 `develop`으로 PR

## 에셋 안내

이 저장소에는 **캐릭터 이미지, 음성 데이터, 학습된 음성 모델이 포함되어 있지 않습니다.**
펫 팩은 직접 준비해야 합니다. 개발 중에는 저장소의 `packs/`, 설치한 앱에서는 `%APPDATA%\desktop-pet\packs\`에 넣습니다.

첫 번째 펫 팩으로 사용 중인 「ちいかわ」 캐릭터의 권리는 © ナガノ / ちいかわ製作委員会에 있습니다.
이 프로젝트는 원작자·제작위원회와 무관한 **비상업적 비공식 팬 프로젝트**입니다.

## License

MIT 라이선스는 [코드](./LICENSE)에만 적용됩니다. 캐릭터·이미지·음성의 권리는 각 권리자에게 있습니다.
`packs/_example`의 에셋은 CC0입니다.
