'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type CreateZoneInput = {
  name: string
  type: 'hydroponic' | 'soil'
}

export async function createZone(input: CreateZoneInput) {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase.from('zones').insert({
    name: input.name,
    type: input.type,
    user_id: user.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/')
}
