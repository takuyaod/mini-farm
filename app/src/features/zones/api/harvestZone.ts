'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export async function harvestZone(
  zonePlantId: string,
  weightG: number | null,
  notes: string | null,
  zoneId: string
): Promise<void> {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase
    .from('zone_plants')
    .update({
      harvested_at: new Date().toISOString(),
      harvest_weight_g: weightG === 0 ? null : weightG,
      notes,
    })
    .eq('id', zonePlantId)

  if (error) throw new Error(error.message)

  revalidatePath(`/zones/${zoneId}`)
}
