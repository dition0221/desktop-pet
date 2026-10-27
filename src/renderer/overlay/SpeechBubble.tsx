export type BubbleAlign = 'left' | 'center' | 'right'

interface SpeechBubbleProps {
  text: string
  /** 펫이 화면 끝에 있으면 말풍선이 잘리지 않게 반대쪽으로 편다 */
  align: BubbleAlign
}

function SpeechBubble({ text, align }: SpeechBubbleProps): React.JSX.Element {
  const position = {
    left: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-0'
  }[align]
  const tailPosition = { left: 'left-6', center: 'left-1/2 -translate-x-1/2', right: 'right-6' }[
    align
  ]

  return (
    <div
      role="status"
      className={`pointer-events-none absolute bottom-full mb-3 w-max max-w-64 animate-bubble-in rounded-2xl border border-primary-200 bg-white px-3.5 py-2 text-left text-neutral-800 text-sm leading-snug shadow-lg ${position}`}
    >
      {text}
      <span
        className={`absolute top-full size-3 -translate-y-1.5 rotate-45 border-primary-200 border-r border-b bg-white ${tailPosition}`}
      />
    </div>
  )
}

export default SpeechBubble
