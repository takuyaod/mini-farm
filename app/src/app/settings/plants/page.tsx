import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { PlantMasterClient } from '@/features/plants/components/PlantMasterClient'
import { getPlantPageData } from '@/features/plants/api/getPlants'

export const metadata: Metadata = {
  title: '植物マスタ管理 | ミニ農園モニタリング',
}

export default async function PlantSettingsPage() {
  const { plants, sensorTypes, thresholdsByPlantId } = await getPlantPageData()

  return (
    <div className="min-h-screen bg-[#f7f8f6]">
      <Header />
      <main className="mx-auto max-w-[1400px] px-8 py-8">
        <PlantMasterClient
          plants={plants}
          sensorTypes={sensorTypes}
          thresholdsByPlantId={thresholdsByPlantId}
        />
      </main>
    </div>
  )
}
