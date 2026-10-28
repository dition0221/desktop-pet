const PORTAL_URL = 'https://www.data.go.kr'
const BUS_APIS = [
  {
    name: '국토교통부_(TAGO)_버스정류소정보',
    url: 'https://www.data.go.kr/data/15098534/openapi.do'
  },
  {
    name: '국토교통부_(TAGO)_버스노선정보',
    url: 'https://www.data.go.kr/data/15098529/openapi.do'
  },
  {
    name: '대전광역시_정류소별 도착정보 조회',
    url: 'https://www.data.go.kr/data/15157920/openapi.do'
  }
]

interface ExternalLinkProps {
  href: string
  children: React.ReactNode
}

/** 새 창 요청은 메인이 막고 허용된 주소만 기본 브라우저로 연다 */
function ExternalLink({ href, children }: ExternalLinkProps): React.JSX.Element {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary-700 underline underline-offset-2 hover:text-primary-800"
    >
      {children}
    </a>
  )
}

function BusKeyGuide(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <p>
        버스 정보는 <ExternalLink href={PORTAL_URL}>공공데이터포털</ExternalLink>의 공개 API로
        받아요. 정부·공공기관이 데이터를 무료로 공개하는 사이트로, 회원가입한 뒤 쓸 API를
        활용신청하면 인증키를 받을 수 있어요.
      </p>
      <ol className="flex list-decimal flex-col gap-1 pl-5">
        <li>공공데이터포털에 회원가입하고 로그인해요</li>
        <li>
          아래 API를 하나씩 열어 활용신청해요 — 키 하나로 모두 쓰지만 신청은 각각 해야 해요
          <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5">
            {BUS_APIS.map(({ name, url }) => (
              <li key={url}>
                <ExternalLink href={url}>{name}</ExternalLink>
              </li>
            ))}
          </ul>
        </li>
        <li>
          마이페이지에서 일반 인증키를 복사해 위 칸에 저장해요 — Encoding·Decoding 어느 쪽이든
          괜찮아요
        </li>
        <li>
          아래 버스 API 연결 확인을 눌러요 — 신청 직후에는 키가 아직 등록되지 않았다는 오류가 날 수
          있으니 조금 기다렸다 다시 확인해요
        </li>
      </ol>
    </div>
  )
}

export default BusKeyGuide
