// Each record describes one inspected passage, with an editorial question in Korean.
// The target section can differ from the source location (e.g. abstract lead used in an introduction).
const passages = [
 ['Abstract','Cell','Zhang et al. · Human chromatin atlas','10.1016/j.cell.2021.10.024','Summary','기존 목록의 해상도 한계에서 출발해 새 자료가 어느 범위까지 채웠는지 제시합니다.','제시한 규모가 첫 문장의 한계를 어떻게 해소하나요?'],
 ['Introduction','Science','Li et al. · Human brain atlas','10.1126/science.adf7044','Abstract 도입부','전사체 연구로 밝혀진 세포 다양성을 먼저 인정한 뒤, 그 정체성을 조절하는 프로그램을 미해결 질문으로 좁힙니다.','기존 성과를 인정하면서 정확히 어떤 설명이 남았다고 말할 수 있나요?'],
 ['Abstract','Genome Biology','Love et al. · DESeq2','10.1186/s13059-014-0550-8','Abstract','적은 반복 수와 이상치 같은 자료의 성질을 제시하고 추정치를 안정화하는 설계와 연결합니다.','방법을 도입하기 전에 그 설계가 필요한 자료의 성질을 설명했나요?'],
 ['Introduction','Nature Methods','Langmead & Salzberg · Bowtie 2','10.1038/nmeth.1923','Abstract 도입부','기존 인덱스의 속도와 메모리 장점을 먼저 밝힌 뒤 긴 갭 정렬에서 생기는 한계로 범위를 좁힙니다.','기존 접근이 잘하는 일과 어려워하는 조건을 각각 명시했나요?'],
 ['Introduction','Genome Biology','Wolf et al. · SCANPY','10.1186/s13059-017-1382-0','Background 마지막 두 문단','기존 도구가 지원하는 분석을 인정한 뒤 증가하는 세포 수가 만드는 문제를 제시합니다.','연구 공백이 드러나는 데이터 규모나 조건을 특정했나요?'],
 ['Results','Genome Biology','Wolf et al. · SCANPY','10.1186/s13059-017-1382-0','Results 첫 소절 · Fig. 1a','통합 분석의 범위를 한 문장으로 밝히고 전처리·시각화·군집화를 기존 접근과 대응시킵니다.','도구 목록 앞에 각 항목이 뒷받침하는 결과를 먼저 제시했나요?'],
 ['Discussion','Genome Biology','Pierson & Yau · ZIFA','10.1186/s13059-015-0805-z','Discussion 첫 네 문단','드롭아웃이 없을 때의 기준 모형을 설명하고, 추가 모델링의 이점과 계산 비용을 함께 제시합니다.','독자가 어떤 조건에서 두 방법이 비슷해지는지, 무엇을 더 부담하는지 알 수 있나요?'],
 ['Results','Genome Biology','Pierson & Yau · ZIFA','10.1186/s13059-015-0805-z','Discussion 직전 · 세포 유형 분리 비교','두 데이터에서 나타난 성능 차이를 세포 유형의 분리 가능성과 드롭아웃 조건에 묶어 설명합니다.','평균 성능에 가려진 개선이 작은 조건도 밝혔나요?'],
 ['Figure legend','Genome Biology','Hafemeister & Satija · sctransform','10.1186/s13059-019-1874-1','Fig. 1c','유전자별 적합선을 그룹으로 묶는 과정을 설명하고 검은 선과 색 영역이 나타내는 통계량을 정의합니다.','선과 음영 각각이 요약하는 관측 단위와 통계량을 명시했나요?'],
 ['Figure legend','Nature Methods','Lopez et al. · scVI','10.1038/s41592-018-0229-2','Supplementary Fig. 1a','무작위 초기화의 반복 수, 중심값, 오차 막대가 뜻하는 산포를 함께 명시합니다.','n이 표본 수인지 분석 반복 횟수인지 그림만 보고 구분할 수 있나요?'],
 ['Methods','PLOS Computational Biology','McMurdie & Holmes · Rarefying microbiome data','10.1371/journal.pcbi.1003531','Methods · Protocol S1 소개','표본 크기를 뽑은 원자료와 재조정 방식을 명시한 뒤, 난수 시드와 실행 코드를 찾을 위치를 안내합니다.','어떤 값이 실제 자료에서 왔고 어떤 값이 시뮬레이션 설정인가요?'],
 ['Results','PLOS Computational Biology','McMurdie & Holmes · Rarefying microbiome data','10.1371/journal.pcbi.1003531','Results/Discussion · Fig. 3','생물학적 반복 간 분산을 기준 모형의 예상치와 비교한 뒤, 차이가 크게 나타나는 범위를 지정합니다.','무엇을 기준으로 예상보다 크다고 말하며 차이가 두드러진 범위는 어디인가요?'],
 ['Abstract','Nature','Pophale et al. · Octopus sleep','10.1038/s41586-023-06203-4','Article 요약 문단','척추동물의 수면 단계를 독자의 출발점으로 삼고, 진화적으로 먼 문어에서 관찰한 행동과 신경 활동을 연결합니다.','새 연구 대상을 선택한 이유가 독자가 아는 현상과 어떻게 이어지나요?'],
 ['Figure legend','eLife','Learning is enhanced by tailoring instruction to individual genetic differences','10.7554/eLife.47216','친부·위탁 양육 비교 그림 · 패널 A–C','실험 배치도, 중앙값에 해당하는 개체의 노래 예시, 둥지별 짝지은 비교 순으로 근거를 배열합니다.','대표 예시를 고른 기준과 통계 검정의 단위를 각각 표시했나요?'],
 ['Figure legend','PLOS Biology','수면 박탈과 CX717 비교 실험','10.1371/journal.pbio.0030299','Fig. 4A–B','같은 성과 지표를 조건별로 보여주면서 패널에 따라 달라지는 유의성 표시의 비교 대상을 지정합니다.','각 패널의 별표가 어느 대조군에 대한 검정인지 명확한가요?']
];
