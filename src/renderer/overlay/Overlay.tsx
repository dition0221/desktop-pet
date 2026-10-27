function Overlay(): React.JSX.Element {
  return (
    <main className="relative h-screen overflow-hidden select-none">
      {/* TODO(R2) — 메인 프로세스가 보낸 펫 위치로 그리기 */}
      <div className="absolute bottom-0 left-1/2 size-16 rounded-lg bg-sky-400/80" />
    </main>
  )
}

export default Overlay
