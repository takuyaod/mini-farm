import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Header } from '@/components/Header'
import { createClient, getClaims } from '@/lib/supabase/server'
import { ZoneSettingsPlant } from '@/features/zones/components/ZoneSettingsPlant'
import { AddDeviceForm, ReissueApiKeySection } from '@/features/zones/components/ZoneSettingsDevice'
import { ZoneSettingsSensor } from '@/features/zones/components/ZoneSettingsSensor'
import type { Device, Plant, Sensor } from '@/features/dashboard/types'

export default async function ZoneSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getClaims()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const { data: zone } = await supabase
    .from('zones')
    .select('id, name, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!zone) notFound()

  const [plantsRes, devicesRes, currentPlantRes] = await Promise.all([
    supabase.from('plants').select('*').order('name', { ascending: true }),
    supabase.from('devices').select('*, sensors(*, sensor_type_masters(*))').eq('zone_id', id),
    supabase.from('zone_plants').select('id').eq('zone_id', id).is('harvested_at', null).maybeSingle(),
  ])

  const plants = (plantsRes.data ?? []) as Plant[]
  const devices = (devicesRes.data ?? []) as Device[]
  const hasCurrentPlant = currentPlantRes.data !== null

  const allActiveSensors = devices.flatMap((d) =>
    d.sensors.filter((s: Sensor) => s.is_active)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center gap-2">
          <Link
            href={`/zones/${id}`}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-200"
            aria-label="ゾーン詳細へ戻る"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{zone.name} — 設定</h1>
        </div>

        <div className="space-y-4">
          {!hasCurrentPlant && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-medium text-gray-800">作付けを開始</h2>
              {plants.length === 0 ? (
                <p className="text-sm text-gray-500">
                  植物マスタに植物を追加してください。
                  <Link href="/settings/plants" className="ml-1 text-green-600 underline">
                    植物マスタ管理
                  </Link>
                </p>
              ) : (
                <ZoneSettingsPlant zoneId={id} plants={plants} />
              )}
            </section>
          )}

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-medium text-gray-800">デバイスを追加</h2>
            <AddDeviceForm zoneId={id} />
          </section>

          {devices.length > 0 && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-medium text-gray-800">APIキー再発行</h2>
              <ReissueApiKeySection devices={devices} />
            </section>
          )}

          {allActiveSensors.length > 0 && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-medium text-gray-800">センサーを削除</h2>
              <ZoneSettingsSensor sensors={allActiveSensors} zoneId={id} />
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
