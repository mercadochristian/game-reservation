'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { FilterAccordion } from '@/components/filter-accordion'
import { createClient } from '@/lib/supabase/client'
import { fadeUpVariants } from '@/lib/animations'
import { useHasAnimated } from '@/lib/hooks/useHasAnimated'
import { usePagination } from '@/lib/hooks/usePagination'
import { SKILL_LEVEL_LABELS } from '@/lib/constants/labels'

type UserRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  role: string
  skill_level: string | null
  is_guest: boolean
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  super_admin: 'Super Admin',
  facilitator: 'Facilitator',
  player: 'Player',
}

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  super_admin: 'default',
  facilitator: 'secondary',
  player: 'outline',
}

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'facilitator', label: 'Facilitator' },
  { value: 'player', label: 'Player' },
]

const SKILL_LEVEL_OPTIONS = [
  { value: '', label: 'All Skill Levels' },
  { value: 'developmental', label: 'Developmental' },
  { value: 'developmental_plus', label: 'Developmental+' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'intermediate_plus', label: 'Intermediate+' },
  { value: 'advanced', label: 'Advanced' },
]

const GUEST_OPTIONS = [
  { value: '', label: 'All Users' },
  { value: 'guest', label: 'Guest' },
  { value: 'registered', label: 'Registered' },
]

export default function UsersClient() {
  const hasAnimated = useHasAnimated()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [guestFilter, setGuestFilter] = useState('')

  useEffect(() => {
    async function fetchUsers() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, skill_level, is_guest, created_at')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setUsers(data as UserRow[])
      }
      setLoading(false)
    }
    fetchUsers()
  }, [])

  const activeFilterCount = [roleFilter, skillFilter, guestFilter].filter(Boolean).length

  const filtered = useMemo(() => {
    let result = users

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(u =>
        [u.first_name, u.last_name, u.email]
          .filter(Boolean)
          .some(v => v!.toLowerCase().includes(q))
      )
    }

    if (roleFilter) {
      result = result.filter(u => u.role === roleFilter)
    }

    if (skillFilter) {
      result = result.filter(u => u.skill_level === skillFilter)
    }

    if (guestFilter === 'guest') {
      result = result.filter(u => u.is_guest)
    } else if (guestFilter === 'registered') {
      result = result.filter(u => !u.is_guest)
    }

    return result
  }, [users, search, roleFilter, skillFilter, guestFilter])

  const {
    currentPage,
    pageSize,
    paginatedItems,
    setCurrentPage,
    setPageSize,
  } = usePagination(filtered)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, roleFilter, skillFilter, guestFilter, setCurrentPage])

  const selectClass =
    'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer'

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Users</h1>
              {!loading && (
                <Badge variant="outline" className="text-xs">
                  {filtered.length}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">View all registered users in the system.</p>
          </div>
        </div>
      </motion.div>

      <motion.div custom={0} initial={hasAnimated.current ? false : 'hidden'} animate="visible" variants={fadeUpVariants}>
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>

        <FilterAccordion
          open={filterOpen}
          onToggle={() => setFilterOpen(prev => !prev)}
          activeFilterCount={activeFilterCount}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className={selectClass}
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Skill Level</label>
              <select
                value={skillFilter}
                onChange={e => setSkillFilter(e.target.value)}
                className={selectClass}
              >
                {SKILL_LEVEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">User Type</label>
              <select
                value={guestFilter}
                onChange={e => setGuestFilter(e.target.value)}
                className={selectClass}
              >
                {GUEST_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </FilterAccordion>
      </motion.div>

      <motion.div custom={1} initial={hasAnimated.current ? false : 'hidden'} animate="visible" variants={fadeUpVariants}>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">
              {search || activeFilterCount > 0 ? 'No users match your filters.' : 'No users found.'}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Skill Level</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}
                      {user.is_guest && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">Guest</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANTS[user.role] ?? 'outline'}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.skill_level
                        ? SKILL_LEVEL_LABELS[user.skill_level] ?? user.skill_level
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination
              currentPage={currentPage}
              totalCount={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              className="mt-4"
            />
          </>
        )}
      </motion.div>
    </div>
  )
}
