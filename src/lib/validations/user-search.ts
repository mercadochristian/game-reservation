import { z } from 'zod'

// Validates the `q` query parameter for the user search API endpoint.
// Enforces minimum length and strips characters that are not valid in names or emails,
// preventing wildcard-only or injection-style inputs from reaching the ilike query.
export const userSearchSchema = z.object({
  q: z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query must be fewer than 100 characters')
    .regex(
      /^[a-zA-Z0-9\s.@'_+-]+$/,
      'Search query contains invalid characters'
    ),
})

export type UserSearchParams = z.infer<typeof userSearchSchema>
