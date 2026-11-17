# PaperDesk | Word 논문 편집기
## 먼저 사용해 보기
압축을 풀고 public/index.html을 브라우저로 여세요. 예시 문단을 넣고 ‘표현·흐름 점검’을 누르면 원문, 수정된 표현, 섹션별 점검 질문을 볼 수 있습니다. 수정안을 직접 편집하면 숫자와 그림 번호 등의 변화가 표시됩니다. 결과를 복사해 Word에 붙여 넣을 수 있습니다. 기본 점검은 영문 표현 치환과 섹션별 코칭입니다.

## Word에 연결하기
1. Node.js 20 이상을 설치하고 이 README가 있는 폴더에서 터미널을 엽니다.
2. `npm install` 후 `npm start`를 실행하고 Office 개발용 로컬 인증서 설치 요청을 승인합니다. 터미널을 열어 둡니다. 브라우저에서 https://localhost:3443 을 열어 확인합니다.
3. Mac에서는 Word를 종료하고 터미널에서 아래 두 줄을 실행합니다. Word를 다시 열고 삽입 또는 홈 탭의 추가 기능 메뉴에서 PaperDesk를 선택합니다.

       mkdir -p ~/Library/Containers/com.microsoft.Word/Data/Documents/wef
       cp manifest.xml ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/

   Windows에서는 manifest.xml이 있는 폴더를 네트워크 공유로 등록한 뒤 Word의 파일 → 옵션 → 보안 센터 → 보안 센터 설정 → 신뢰할 수 있는 추가 기능 카탈로그에 공유 경로를 추가하고 메뉴에 표시하도록 설정합니다. Word를 재시작하고 추가 기능 → 공유 폴더에서 PaperDesk를 선택합니다. 조직에서 개발용 추가 기능을 제한하면 브라우저 버전을 사용할 수 있습니다.

   [Microsoft Mac 안내](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/sideload-an-office-add-in-on-mac) · [Microsoft Windows 안내](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/create-a-network-shared-folder-catalog-for-task-pane-and-content-add-ins)
4. Word에서 문단 기호를 제외한 본문을 드래그하고 ‘Word 선택 영역 가져오기’를 누릅니다. 수정안을 검토하고 같은 본문이 선택된 상태에서 적용합니다. 텍스트 교체 시 부분별 글꼴·강조 서식은 달라질 수 있습니다. 인용 필드 등 복합 요소가 있는 문장은 복사해서 부분 수정하세요. Word의 실행 취소로 되돌릴 수 있습니다.

## AI 초안 (선택)
서버를 시작하는 터미널에 OPENAI_API_KEY 환경 변수를 설정한 뒤 npm start를 실행합니다. 이미 가동 중이면 종료 후 다시 실행합니다. Mac에서는 키가 화면이나 셸 기록에 남지 않도록 다음과 같이 입력할 수 있습니다 (zsh).

    read -rs 'OPENAI_API_KEY?OpenAI API key: '
    export OPENAI_API_KEY
    npm start

Windows PowerShell에서는 아래를 사용합니다.

    $env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'OpenAI API key' -AsSecureString)).Password
    npm start

‘AI 영문 초안 생성’을 누르면 입력한 원문, 섹션, 저널, 작성 기준이 OpenAI API로 전송되며 API 요금이 발생할 수 있습니다. 기본 모델은 gpt-4.1-mini이며 OPENAI_MODEL로 변경할 수 있습니다. 결과를 수정한 뒤 반영하세요. 한국어 메모에서는 영문 표현 대조의 오탐이 있을 수 있습니다. 자동 대조는 의미 검증이나 통계 검정이 아닙니다.

## GitHub에서 사용하기
Code → Codespaces → Create codespace를 열고 터미널에서 아래 명령을 실행합니다. Ports 탭에서 8000번 포트의 브라우저 열기를 선택하세요. 정적 미리보기는 원고 입력, 비교, 섹션별 논문 사례를 지원합니다. Word와 AI는 위의 로컬 실행 경로에서 이용합니다.

    python3 -m http.server 8000 --directory public

## 논문 사례
public/corpus.js에는 12개 원저에서 확인한 15개 구절의 편집 사례가 들어 있습니다. 각 항목은 적용 섹션, 저널, 논문, DOI, 실제 읽은 위치, 전개 방식, 작성자 질문 순서입니다. 같은 논문의 다른 섹션은 동일 DOI를 유지합니다. Nature와 PLOS Biology 공식 지침은 별도로 관리합니다.

## 전체 문헌 범위와 누적 처리

- **실시간 검색**. Word 패널과 브라우저 편집기에서 Europe PMC의 제목, 주제, 저널, DOI를 검색합니다. 빈 검색어는 PubMed 레코드(SRC:MED) 전체를 대상으로 합니다. 20건은 한 페이지의 표시 단위이며 마지막 결과까지 이어볼 수 있습니다. 검색어만 전송합니다. 초록 또는 공개 전문에서 선택 섹션의 길이와 대조·유보·목적 표현을 점검하고 작성 기준에 추가합니다. 브라우저의 외부 요청이 제한되면 로컬 서버 또는 Europe PMC 직접 링크를 이용하세요.
- **일괄 초록 분석**. Python 3.11 이상에서 `python3 scripts/baseline.py`를 실행합니다. 공식 PubMed 연간 기준본 전체 목록을 읽고, 파일별 MD5 검증 후 영문 초록의 구조화 및 표현 사용 빈도를 집계합니다. 파일별 결과가 체크포인트입니다. 연간 기준본 통계와 일별로 변하는 온라인 검색 결과는 집계 시점이 다릅니다. 본문이나 원문 초록은 재배포하지 않습니다.
- **일괄 본문 분석**. `python3 scripts/fulltext.py`는 Europe PMC 공개 전문을 순회하고, 확인한 각 본문의 IMRaD 문단 및 그림 설명 개수를 집계합니다. 처리한 PMCID와 검색 커서는 data/oa.sqlite에 기록됩니다. 다시 실행하면 이어서 처리합니다. 영어 섹션 제목과 XML 태그를 기준으로 하므로 형식이 다른 글에서는 일부 구절을 놓칠 수 있습니다. 네트워크 오류는 다시 시도할 목록에 남습니다.
- **분할 실행**. 예를 들어 `python3 scripts/baseline.py --batch 50`은 아직 처리하지 않은 파일 50개, `python3 scripts/fulltext.py --pages 2`는 이어지는 두 페이지를 처리합니다. 분할 실행 시 같은 종류의 작업은 한 번에 하나만 실행하세요. 초기 수동 사례는 별도로 표시합니다. 통계 자체는 모델 학습을 의미하지 않습니다.

[PubMed 배포 설명](https://pubmed.ncbi.nlm.nih.gov/download/) · [Europe PMC API](https://europepmc.org/RestfulWebService)
