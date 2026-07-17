import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient, requireUser } from '@/lib/supabase/server'
import { ZoneSettingsName } from '@/features/zones/components/ZoneSettingsName'
import { ZoneSettingsPlant } from '@/features/zones/components/ZoneSettingsPlant'
import { DeviceManagementSection } from '@/features/zones/components/ZoneSettingsDevice'
import { ZoneSettingsSensor } from '@/features/zones/components/ZoneSettingsSensor'
import { ZoneSettingsDanger } from '@/features/zones/components/ZoneSettingsDanger'
import type { Device, Plant, Sensor } from '@/types'
import type { PendingDevice } from '@/features/zones/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: zone } = await supabase.from('zones').select('name').eq('id', id).single()
  const name = zone?.name ?? 'ゾーン'
  return { title: `${name} — 設定 | mini-farm` }
}

export default async function ZoneSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()

  const supabase = await createClient()

  const { data: zone } = await supabase
    .from('zones')
    .select('id, name, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!zone) notFound()

  const [plantsRes, devicesRes, pendingDevicesRes, currentPlantRes] = await Promise.all([
    supabase.from('plants').select('*').order('name', { ascending: true }),
    supabase.from('devices').select('*, sensors(*, sensor_type_masters(*))').eq('zone_id', id),
    // pending 一覧は全ユーザー共通（RLS の「公開 pending」条件で公開分 + 自分の所有者持ち pending がフィルタされる）
    supabase
      .from('devices')
      .select('id, mac_address, created_at, firmware_ver')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase.from('zone_plants').select('id').eq('zone_id', id).is('harvested_at', null).maybeSingle(),
  ])

  const plants = (plantsRes.data ?? []) as Plant[]
  const devices = (devicesRes.data ?? []) as Device[]
  const pendingDevices = (pendingDevicesRes.data ?? []) as PendingDevice[]
  const hasCurrentPlant = currentPlantRes.data !== null

  const allActiveSensors = devices.flatMap((d) =>
    d.sensors.filter((s: Sensor) => s.is_active)
  )

  return (
    <div className="min-h-screen bg-gray-50">
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
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-medium text-gray-800">ゾーン名を変更</h2>
            <ZoneSettingsName zoneId={id} currentName={zone.name} />
          </section>

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
            <h2 className="mb-4 text-base font-medium text-gray-800">デバイス管理</h2>
            <DeviceManagementSection
              pendingDevices={pendingDevices}
              devices={devices}
              zoneId={id}
            />
          </section>

          {allActiveSensors.length > 0 && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-medium text-gray-800">センサーを削除</h2>
              <ZoneSettingsSensor sensors={allActiveSensors} zoneId={id} />
            </section>
          )}

          <section className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-medium text-red-700">ゾーンを休止する</h2>
            <ZoneSettingsDanger zoneId={id} />
          </section>
        </div>
      </main>
    </div>
  )
}
