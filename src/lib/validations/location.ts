import { z } from 'zod'

export const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(255),
  address: z.string().max(500).optional().nullable(),
  google_map_url: z.string().url('Must be a valid URL').max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  is_active: z.boolean(),
})

export type LocationFormData = z.infer<typeof locationSchema>
