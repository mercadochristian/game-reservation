'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Users, Edit2, Ban, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { FilterAccordion } from '@/components/filter-accordion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { EditUserModal } from './edit-user-modal'
import { createClient } from '@/lib/supabase/client'
import { fadeUpVariants } from '@/lib/animations'
import { useHasAnimated } from '@/lib/hooks/useHasAnimated'
import { usePagination } from '@/lib/hooks/usePagination'
import { useUser } from '@/lib/context/user-context'
import { SKILL_LEVEL_LABELS } from '@/lib/constants/labels'
import type { UserRole, SkillLevel } from '@/types'

type UserRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  role: UserRole
  skill_level: SkillLevel | null
  player_contact_number: string | null
  emergency_contact_name: string | null
  emergency_contact_relationship: string | null
  emergency_contact_number: string | null
  is_guest: boolean
  banned_at: string | null
  created_at: string
}

type TypeFilter = '' | 'registered' | 'guest' | 'banned'

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

function TypeBadge({ user }: { user: UserRow }) {
  if (user.banned_at) {
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 dark:bg-destructive/20">Banned</Badge>
  }
  if (user.is_guest) {
    return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400">Guest</Badge>
  }
  return <Badge className="bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400">Registered</Badge>
}

export default function UsersClient() {
  const hasAnimated = useHasAnimated()
  const { user: currentUser } = useUser()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('')
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [banConfirmUser, setBanConfirmUser] = useState<UserRow | null>(null)
  const [banning, setBanning] = useState(false)

  const fetchUsers = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, skill_level, player_contact_number, emergency_contact_name, emergency_contact_relationship, emergency_contact_number, is_guest, banned_at, created_at')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setUsers(data as UserRow[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleBan = async () => {
    if (!banConfirmUser) return
    setBanning(true)
    try {
      const res = await fetch(`/api/users/${banConfirmUser.id}/ban`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.message ?? 'Failed to ban user.')
        return
      }
      const name = [banConfirmUser.first_name, banConfirmUser.last_name].filter(Boolean).join(' ') || 'User'
      toast.success(`${name} has been banned.`)
      setBanConfirmUser(null)
      fetchUsers()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setBanning(false)
    }
  }

  const handleUnban = async (user: UserRow) => {
    try {
      const res = await fetch(`/api/users/${user.id}/unban`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.message ?? 'Failed to unban user.')
        return
      }
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User'
      toast.success(`${name} has been unbanned.`)
      fetchUsers()
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  const activeFilterCount = [roleFilter, skillFilter].filter(Boolean).length

  // Base filtered: search + role + skill (before type chip filter)
  const baseFiltered = useMemo(() => {
    let result = users
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(u =>
        [u.first_name, u.last_name, u.email]
          .filter(Boolean)
          .some(v => v!.toLowerCase().includes(q))
      )
    }
    if (roleFilter) result = result.filter(u => u.role === roleFilter)
    if (skillFilter) result = result.filter(u => u.skill_level === skillFilter)
    return result
  }, [users, search, roleFilter, skillFilter])

  const typeCounts = useMemo(() => ({
    all: baseFiltered.length,
    registered: baseFiltered.filter(u => !u.is_guest && !u.banned_at).length,
    guest: baseFiltered.filter(u => u.is_guest && !u.banned_at).length,
    banned: baseFiltered.filter(u => !!u.banned_at).length,
  }), [baseFiltered])

  const filtered = useMemo(() => {
    if (typeFilter === 'registered') return baseFiltered.filter(u => !u.is_guest && !u.banned_at)
    if (typeFilter === 'guest') return baseFiltered.filter(u => u.is_guest && !u.banned_at)
    if (typeFilter === 'banned') return baseFiltered.filter(u => !!u.banned_at)
    return baseFiltered
  }, [baseFiltered, typeFilter])

  const { currentPage, pageSize, paginatedItems, setCurrentPage, setPageSize } = usePagination(filtered)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, roleFilter, skillFilter, typeFilter, setCurrentPage])

  const selectClass =
    'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer'

  const typeChips: { value: TypeFilter; label: string; count: number }[] = [
    { value: '', label: 'All', count: typeCounts.all },
    { value: 'registered', label: 'Registered', count: typeCounts.registered },
    { value: 'guest', label: 'Guests', count: typeCounts.guest },
    { value: 'banned', label: 'Banned', count: typeCounts.banned },
  ]

  const displayName = (user: UserRow) =>
    [user.first_name, user.last_name].filter(Boolean).join(' ') || '—'

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Users</h1>
              {!loading && (
                <Badge variant="outline" className="text-xs">{filtered.length}</Badge>
              )}
            </div>
            <p className="text-muted-foreground">View and manage all users in the system.</p>
          </div>
        </div>
      </motion.div>

      <motion.div custom={0} initial={hasAnimated.current ? false : 'hidden'} animate="visible" variants={fadeUpVariants}>
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>

        {/* Type filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
          {typeChips.map(chip => (
            <button
              key={chip.value}
              onClick={() => setTypeFilter(chip.value)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                typeFilter === chip.value
                  ? chip.value === 'banned'
                    ? 'bg-destructive/20 text-destructive border-destructive/40 font-semibold'
                    : 'bg-primary text-primary-foreground border-primary font-semibold'
                  : chip.value === 'banned'
                    ? 'bg-destructive/10 text-destructive/70 border-destructive/20 hover:bg-destructive/15'
                    : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {chip.label} ({chip.count})
            </button>
          ))}
        </div>

        <FilterAccordion
          open={filterOpen}
          onToggle={() => setFilterOpen(prev => !prev)}
          activeFilterCount={activeFilterCount}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={selectClass}>
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Skill Level</label>
              <select value={skillFilter} onChange={e => setSkillFilter(e.target.value)} className={selectClass}>
                {SKILL_LEVEL_OPTIONS.map(opt => (
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
              {search || activeFilterCount > 0 || typeFilter ? 'No users match your filters.' : 'No users found.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Skill Level</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map(user => (
                    <TableRow
                      key={user.id}
                      className={user.banned_at ? 'opacity-60 bg-destructive/5' : ''}
                    >
                      <TableCell className={`font-medium ${user.banned_at ? 'line-through text-muted-foreground' : ''}`}>
                        {displayName(user)}
                      </TableCell>
                      <TableCell className={`text-muted-foreground ${user.banned_at ? 'line-through' : ''}`}>
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ROLE_VARIANTS[user.role] ?? 'outline'}>
                          {ROLE_LABELS[user.role] ?? user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TypeBadge user={user} />
                      </TableCell>
                      <TableCell>
                        {user.skill_level ? SKILL_LEVEL_LABELS[user.skill_level] ?? user.skill_level : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { setSelectedUser(user); setIsModalOpen(true) }}
                            aria-label={`Edit ${displayName(user)}`}
                          >
                            <Edit2 size={16} />
                          </Button>
                          {user.banned_at ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-500/10 dark:text-green-400"
                              onClick={() => handleUnban(user)}
                              aria-label={`Unban ${displayName(user)}`}
                            >
                              <ShieldCheck size={16} />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setBanConfirmUser(user)}
                              aria-label={`Ban ${displayName(user)}`}
                            >
                              <Ban size={16} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-3">
              {paginatedItems.map(user => (
                <div
                  key={user.id}
                  className={`rounded-lg border p-4 ${user.banned_at ? 'bg-destructive/5 border-destructive/20 opacity-65' : 'bg-card border-border'}`}
                >
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold text-sm ${user.banned_at ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {displayName(user)}
                      </span>
                      <TypeBadge user={user} />
                    </div>
                    <p className={`text-xs mb-1 ${user.banned_at ? 'line-through text-muted-foreground/60' : 'text-muted-foreground'}`}>
                      {user.email}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant={ROLE_VARIANTS[user.role] ?? 'outline'} className="text-[10px]">
                        {ROLE_LABELS[user.role] ?? user.role}
                      </Badge>
                      {user.skill_level && (
                        <span className="text-[10px] text-muted-foreground">
                          {SKILL_LEVEL_LABELS[user.skill_level] ?? user.skill_level}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-border pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setSelectedUser(user); setIsModalOpen(true) }}
                    >
                      <Edit2 size={13} className="mr-1.5" />
                      Edit
                    </Button>
                    {user.banned_at ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-green-600 border-green-500/40 hover:bg-green-500/10 dark:text-green-400"
                        onClick={() => handleUnban(user)}
                      >
                        <ShieldCheck size={13} className="mr-1.5" />
                        Unban
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={() => setBanConfirmUser(user)}
                      >
                        <Ban size={13} className="mr-1.5" />
                        Ban
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

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

      {/* Edit modal */}
      {selectedUser && currentUser && (
        <EditUserModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedUser(null) }}
          onSuccess={() => { setIsModalOpen(false); setSelectedUser(null); fetchUsers() }}
          user={selectedUser}
          currentUserRole={currentUser.role as UserRole}
        />
      )}

      {/* Ban confirmation dialog */}
      <Dialog open={!!banConfirmUser} onOpenChange={open => { if (!open) setBanConfirmUser(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban {banConfirmUser ? displayName(banConfirmUser) : ''}?</DialogTitle>
            <DialogDescription>
              This will lock their account. They won&apos;t be able to sign in. You can unban them at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanConfirmUser(null)} disabled={banning}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBan} disabled={banning}>
              {banning ? 'Banning...' : 'Ban User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
