import type { PackSummary } from '@preload/api'
import Button from '@renderer/mainWindow/components/Button'
import Page from '@renderer/mainWindow/components/Page'
import { useSettings } from '@renderer/mainWindow/hooks/useSettings'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/pet')({
  component: PetScreen
})

function PetScreen(): React.JSX.Element {
  const settings = useSettings()
  const [packs, setPacks] = useState<PackSummary[]>([])
  const [failedPackId, setFailedPackId] = useState<string | null>(null)

  useEffect(() => {
    void window.api.packs.list().then(setPacks)
  }, [])

  const selectPack = async (id: string): Promise<void> => {
    const ok = await window.api.packs.select(id)
    setFailedPackId(ok ? null : id)
  }

  return (
    <Page title="펫">
      <Button
        disabled={!settings}
        onClick={() => void window.api.pet.setVisible(!settings?.petVisible)}
        className="self-start"
      >
        {settings?.petVisible ? '펫 숨기기' : '펫 보이기'}
      </Button>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium text-sm">팩</legend>
        {packs.map((pack) => (
          <label
            key={pack.id}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-neutral-100"
          >
            <input
              type="radio"
              name="pack"
              checked={settings?.packId === pack.id}
              onChange={() => void selectPack(pack.id)}
            />
            {pack.name}
            <span className="text-neutral-400">{pack.id}</span>
          </label>
        ))}
        {failedPackId && (
          <p role="alert" className="text-red-600 text-sm">
            {failedPackId} 팩을 읽지 못했어요
          </p>
        )}
      </fieldset>
    </Page>
  )
}
