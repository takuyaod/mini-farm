import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { AddPlantForm } from '@/features/plants/components/AddPlantForm'
import { ThresholdEditor } from '@/features/plants/components/ThresholdEditor'
import { getPlantPageData } from '@/features/plants/api/getPlants'

export const metadata: Metadata = {
  title: '植物マスタ管理 | ミニ農園モニタリング',
}

export default async function PlantSettingsPage() {
  const { plants, sensorTypes, thresholdsByPlantId } = await getPlantPageData()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-xl font-semibold text-gray-900">植物マスタ管理</h1>

        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-medium text-gray-800">植物を追加</h2>
          <AddPlantForm />
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-medium text-gray-800">閾値の編集</h2>
          {plants.length === 0 ? (
            <p className="text-sm text-gray-500">植物を追加してください</p>
          ) : (
            <ThresholdEditor
              plants={plants}
              sensorTypes={sensorTypes}
              thresholdsByPlantId={thresholdsByPlantId}
            />
          )}
        </section>
      </main>
    </div>
  )
}
