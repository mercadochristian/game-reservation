# Registration Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `register-client.tsx` from a single scrolling column into a split-panel layout: dark navy cart sidebar (desktop) + full-width form with mobile cart modal.

**Architecture:** All existing state, handlers, and business logic remain unchanged. Only the JSX structure is rewritten. The cart panel absorbs the "Amount Due" display and the register CTA; the form panel holds mode/position/players/payment sections. Mobile gets a fixed footer bar and a bottom-sheet cart modal triggered by a cart badge.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, Framer Motion v12, `@/components/ui/*`, Lucide icons.

---

## File Map

| File | Change |
|---|---|
| `src/app/register/[scheduleId]/register-client.tsx` | Full JSX rewrite — split panel shell, cart panel, form panel, mobile modal. All state/handlers untouched. |

---

### Task 1: Extract cart total helper + add cart modal state

**Goal:** Add one piece of state and extract the total calculation so both the cart panel and the mobile footer can read it without duplicating logic.

**Files:**
- Modify: `src/app/register/[scheduleId]/register-client.tsx`

- [ ] **Step 1: Add `cartModalOpen` state after the existing `mode` state (~line 112)**

Find this block:
```tsx
const [mode, setMode] = useState<'solo' | 'group' | 'team'>('solo')
```

Add immediately after:
```tsx
const [cartModalOpen, setCartModalOpen] = useState(false)
```

- [ ] **Step 2: Add `computeCartTotal` helper just above the `RegisterClient` function (~line 69)**

Find this comment (just above the `RegisterClientProps` interface):
```tsx
export interface RegisterClientProps {
```

Insert above it:
```tsx
function computeCartTotal(
  selectedSchedules: Record<string, ScheduleSlot>,
  mode: 'solo' | 'group' | 'team',
  position: PlayerPosition | null,
  groupPlayers: GroupPlayer_[]
): { totalAmount: number; costLines: Array<{ label: string; amount: number }> } {
  const costLines: Array<{ label: string; amount: number }> = []
  let totalAmount = 0

  if (mode === 'solo') {
    Object.values(selectedSchedules).forEach(slot => {
      const amount = computeSoloAmount(
        {
          position_prices: slot.schedule.position_prices as Record<string, number>,
          team_price: slot.schedule.team_price,
        },
        position
      )
      costLines.push({ label: slot.schedule.locations?.name || 'Game', amount })
      totalAmount += amount
    })
  } else if (mode === 'group') {
    const primarySlot = Object.values(selectedSchedules)[0]
    groupPlayers.forEach(player => {
      const amount = computeSoloAmount(
        {
          position_prices: primarySlot.schedule.position_prices as Record<string, number>,
          team_price: primarySlot.schedule.team_price,
        },
        player.preferred_position
      )
      costLines.push({ label: `${player.first_name} ${player.last_name}`, amount })
      totalAmount += amount
    })
  } else {
    const primarySlot = Object.values(selectedSchedules)[0]
    const teamPrice = primarySlot.schedule.team_price || 0
    costLines.push({ label: 'Team Registration', amount: teamPrice })
    totalAmount = teamPrice
  }

  return { totalAmount, costLines }
}
```

- [ ] **Step 3: Call `computeCartTotal` inside `RegisterClient`, just before the `primarySchedule` const (~line 534)**

Find:
```tsx
const primarySchedule = primaryScheduleSlot.schedule
```

Insert above it:
```tsx
const { totalAmount } = computeCartTotal(selectedSchedules, mode, position, groupPlayers)
const scheduleCount = Object.keys(selectedSchedules).length
```

- [ ] **Step 4: Run lint to verify no new errors**

```bash
cd /Users/christianmercado/Documents/Work/Personal/game-reservation && npm run lint 2>&1 | tail -20
```

Expected: no errors on lines you just changed.

- [ ] **Step 5: Commit**

```bash
cd /Users/christianmercado/Documents/Work/Personal/game-reservation
git add src/app/register/\[scheduleId\]/register-client.tsx
git commit -m "refactor(register): extract computeCartTotal helper + add cartModalOpen state"
```

---

### Task 2: Rewrite the outer shell (split panel wrapper)

**Goal:** Replace the `min-h-screen bg-background > max-w-lg mx-auto px-4 py-8` wrapper with a split panel shell. The error screen and success screens are untouched — only the main `return` block changes.

**Files:**
- Modify: `src/app/register/[scheduleId]/register-client.tsx`

- [ ] **Step 1: Replace the opening of the main return block**

Find (the main return, around line 675):
```tsx
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/?date=${dateParam || ''}`)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
```

Replace with:
```tsx
  return (
    <div className="flex min-h-[100dvh] bg-background">

      {/* ── MOBILE: Top nav ── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-20 flex items-center justify-between px-4 h-14 bg-[#0f172a]">
        <button
          onClick={() => router.push(`/?date=${dateParam || ''}`)}
          className="flex items-center gap-1 text-sm text-sky-400 cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-white">Register</span>
        <button
          onClick={() => setCartModalOpen(true)}
          className="flex flex-col items-end cursor-pointer"
          aria-label="View cart"
        >
          <span className="text-[10px] text-slate-500 leading-none">{scheduleCount} {scheduleCount === 1 ? 'game' : 'games'}</span>
          <span className="text-sm font-extrabold text-sky-400 leading-none">₱{totalAmount.toFixed(0)} ▸</span>
        </button>
      </div>

      {/* ── DESKTOP: Left cart panel ── */}
      <aside className="hidden lg:flex flex-col w-[300px] shrink-0 bg-[#0f172a] sticky top-0 h-screen overflow-y-auto">
        {/* cart panel content — Task 3 */}
      </aside>

      {/* ── Form panel (right on desktop, full-width on mobile) ── */}
      <main className="flex-1 overflow-y-auto pt-14 pb-20 px-4 lg:pt-8 lg:pb-8 lg:px-8">
        {/* form content — Task 4 */}
      </main>

      {/* ── MOBILE: Fixed footer bar ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-[#0f172a] px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-slate-500">{scheduleCount} {scheduleCount === 1 ? 'game' : 'games'} selected</p>
          <p className="text-sm font-extrabold text-sky-400">₱{totalAmount.toFixed(0)}</p>
        </div>
        {/* register button — Task 5 */}
      </div>

      {/* ── MOBILE: Cart modal ── Task 4 */}

      {/* Payment Channels Modal (unchanged) */}
      <PaymentChannelsModal
        open={showPaymentChannelsModal}
        onOpenChange={setShowPaymentChannelsModal}
        onContinue={(channelId) => {
          setSelectedChannelId(channelId)
        }}
      />
    </div>
  )
```

- [ ] **Step 2: Remove the old closing `</div></div>` and PaymentChannelsModal**

The old return block ended with:
```tsx
      {/* Payment Channels Modal */}
      <PaymentChannelsModal
        open={showPaymentChannelsModal}
        onOpenChange={setShowPaymentChannelsModal}
        onContinue={(channelId) => {
          setSelectedChannelId(channelId)
        }}
      />
    </div>
  )
}
```

Delete everything between the old `{/* Page Title + Solo/Group/Team Toggle */}` block and the old closing `</div></div>`. The old content (title, schedules list, add game button, position section, group section, team section, payment summary, payment screenshot, submit row) will be reintroduced in Tasks 3, 4, and 5.

Temporarily leave `{/* form content — Task 4 */}` and `{/* cart panel content — Task 3 */}` as placeholder comments so the file compiles.

- [ ] **Step 3: Verify the page compiles (no red errors in IDE)**

```bash
cd /Users/christianmercado/Documents/Work/Personal/game-reservation && npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: Only type errors if any — layout shell should compile cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/app/register/\[scheduleId\]/register-client.tsx
git commit -m "refactor(register): scaffold split panel shell (mobile nav + desktop aside + form main)"
```

---

### Task 3: Build the desktop cart panel

**Goal:** Fill the `<aside>` with game cards, inline add-game expand, running total, and the desktop Register CTA. This moves the selected-schedules list and add-game logic from the old main column into the sidebar.

**Files:**
- Modify: `src/app/register/[scheduleId]/register-client.tsx`

- [ ] **Step 1: Replace `{/* cart panel content — Task 3 */}` inside `<aside>` with:**

```tsx
        {/* Header */}
        <div className="px-5 pt-6 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Your Games</p>
        </div>

        {/* Selected game cards */}
        <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-4">
          {Object.entries(selectedSchedules).map(([id, slot], idx) => {
            const isPrimary = idx === 0
            const s = slot.schedule
            return (
              <div key={id} className="relative bg-[#1e293b] rounded-lg p-3">
                {!isPrimary && (
                  <button
                    onClick={() => handleRemoveSchedule(id)}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#334155] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Remove game"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <p className="text-[13px] font-bold text-white pr-6">{s.locations?.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {formatScheduleDateWithWeekday(s.start_time)} · {formatScheduleTime(s.start_time)}
                </p>
                <p className="text-[11px] text-slate-400 text-xs mt-0.5">{s.locations?.address}</p>
                <p className="text-[15px] font-extrabold text-sky-400 mt-2">
                  ₱{computeSoloAmount(
                    { position_prices: s.position_prices as Record<string, number>, team_price: s.team_price },
                    position
                  ).toFixed(0)}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {(s.max_players - slot.registrationCount)} spots remaining
                </p>
              </div>
            )
          })}

          {/* Inline add-game expand */}
          <div className="border border-dashed border-[#334155] rounded-lg overflow-hidden">
            <button
              onClick={() => {
                if (!availableLoaded) fetchAvailableSchedules()
                setPanelOpen(!panelOpen)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              {panelOpen ? 'Hide games' : 'Add another game'}
            </button>

            <AnimatePresence>
              {panelOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden bg-[#020617] border-t border-[#1e293b]"
                >
                  {availableLoading ? (
                    <div className="p-3 space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-8 bg-[#1e293b] rounded animate-pulse" />
                      ))}
                    </div>
                  ) : availableSchedules.length === 0 ? (
                    <p className="text-[11px] text-slate-500 text-center py-4">No additional games available</p>
                  ) : (
                    <div>
                      {availableSchedules.map(s => (
                        <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#0f172a] last:border-b-0">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-white truncate">{s.locations?.name}</p>
                            <p className="text-[10px] text-sky-400">
                              {formatScheduleDateWithWeekday(s.start_time)} · ₱{computeSoloAmount(
                                { position_prices: s.position_prices as Record<string, number>, team_price: s.team_price },
                                position
                              ).toFixed(0)}
                            </p>
                          </div>
                          <Button size="xs" onClick={() => handleAddSchedule(s)} className="shrink-0">
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Total + CTA */}
        <div className="px-5 py-5 border-t border-[#1e293b]">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-[11px] text-slate-500">{scheduleCount} {scheduleCount === 1 ? 'game' : 'games'}</p>
              <p className="text-[11px] text-slate-500">Total</p>
            </div>
            <p className="text-2xl font-black text-white">₱{totalAmount.toFixed(0)}</p>
          </div>
          <Button
            className="w-full"
            onClick={handleRegister}
            disabled={
              !paymentFile ||
              isSubmitting ||
              (mode === 'solo' && !position) ||
              ((mode === 'group' || mode === 'team') && groupPlayers.some(p => !p.preferred_position)) ||
              (mode === 'team' && (() => {
                const counts = countPositions(groupPlayers)
                return Object.entries(TEAM_REQUIRED_POSITIONS).some(([pos, req]) => (counts[pos] || 0) < req)
              })())
            }
          >
            {isSubmitting
              ? 'Registering...'
              : mode === 'solo'
                ? `Register → (${scheduleCount} ${scheduleCount === 1 ? 'game' : 'games'})`
                : `Register ${groupPlayers.length} ${groupPlayers.length === 1 ? 'player' : 'players'} →`}
          </Button>
        </div>
```

- [ ] **Step 2: Run dev server and verify desktop cart panel renders**

```bash
cd /Users/christianmercado/Documents/Work/Personal/game-reservation && npm run dev
```

Open `http://localhost:3000/register/<scheduleId>` at ≥ 1024px width. Expected: dark navy sidebar on left with game card, "Add another game" button, total, and Register CTA.

- [ ] **Step 3: Commit**

```bash
git add src/app/register/\[scheduleId\]/register-client.tsx
git commit -m "feat(register): add desktop cart panel with game cards, inline add-game, and CTA"
```

---

### Task 4: Build the mobile cart modal

**Goal:** Implement the bottom-sheet modal that opens when the cart badge or footer total is tapped. Shows all selected games, inline add-game expand, total, and a Done button.

**Files:**
- Modify: `src/app/register/[scheduleId]/register-client.tsx`

- [ ] **Step 1: Replace `{/* ── MOBILE: Cart modal ── Task 4 */}` with:**

```tsx
      {/* ── MOBILE: Cart modal (bottom sheet) ── */}
      <AnimatePresence>
        {cartModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-30 bg-black/60"
              onClick={() => setCartModalOpen(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white rounded-t-2xl max-h-[80vh] flex flex-col"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-muted" />
              </div>

              <div className="px-5 py-3">
                <p className="text-[15px] font-bold">Your Games</p>
              </div>

              <div className="overflow-y-auto flex-1 px-5 space-y-3 pb-3">
                {/* Selected game rows */}
                {Object.entries(selectedSchedules).map(([id, slot], idx) => {
                  const isPrimary = idx === 0
                  const s = slot.schedule
                  return (
                    <div key={id} className="border border-border rounded-lg p-3 flex justify-between items-start">
                      <div>
                        <p className="text-[13px] font-bold">{s.locations?.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatScheduleDateWithWeekday(s.start_time)} · {formatScheduleTime(s.start_time)}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-[14px] font-extrabold text-primary">
                          ₱{computeSoloAmount(
                            { position_prices: s.position_prices as Record<string, number>, team_price: s.team_price },
                            position
                          ).toFixed(0)}
                        </p>
                        {!isPrimary && (
                          <button
                            onClick={() => handleRemoveSchedule(id)}
                            className="text-[11px] text-destructive mt-1 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Inline add-game expand inside modal */}
                <div className="border border-dashed border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => {
                      if (!availableLoaded) fetchAvailableSchedules()
                      setPanelOpen(!panelOpen)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {panelOpen ? 'Hide games' : '＋ Add another game'}
                  </button>

                  <AnimatePresence>
                    {panelOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border"
                      >
                        {availableLoading ? (
                          <div className="p-3 space-y-2">
                            {[...Array(2)].map((_, i) => (
                              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                            ))}
                          </div>
                        ) : availableSchedules.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground text-center py-4">No additional games available</p>
                        ) : (
                          <div>
                            {availableSchedules.map(s => (
                              <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border last:border-b-0">
                                <div className="min-w-0">
                                  <p className="text-[12px] font-semibold truncate">{s.locations?.name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatScheduleDateWithWeekday(s.start_time)} · ₱{computeSoloAmount(
                                      { position_prices: s.position_prices as Record<string, number>, team_price: s.team_price },
                                      position
                                    ).toFixed(0)}
                                  </p>
                                </div>
                                <Button size="xs" onClick={() => { handleAddSchedule(s); setPanelOpen(false) }} className="shrink-0">
                                  Add
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Total + Done */}
              <div className="px-5 py-4 border-t border-border">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[13px] text-muted-foreground">Total</p>
                  <p className="text-xl font-black">₱{totalAmount.toFixed(0)}</p>
                </div>
                <Button className="w-full" variant="outline" onClick={() => setCartModalOpen(false)}>
                  Done
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
```

- [ ] **Step 2: Verify mobile cart modal works**

Open dev server, resize browser to < 1024px. Tap the `₱ ▸` badge in the top nav. Expected: bottom sheet slides up showing game list and Done button.

- [ ] **Step 3: Commit**

```bash
git add src/app/register/\[scheduleId\]/register-client.tsx
git commit -m "feat(register): add mobile cart bottom sheet modal"
```

---

### Task 5: Build the form panel content

**Goal:** Fill `<main>` with the three section cards (Mode, Position/Players, Payment) and wire the mobile footer Register button. Remove the old Amount Due card (total is now in the cart panel) and the old Cancel/Register row.

**Files:**
- Modify: `src/app/register/[scheduleId]/register-client.tsx`

- [ ] **Step 1: Replace `{/* form content — Task 4 */}` inside `<main>` with:**

```tsx
        {/* Title */}
        <motion.div
          initial={hasAnimated.current ? false : 'hidden'}
          animate="visible"
          variants={fadeUpVariants}
          custom={0}
          className="mb-6"
        >
          <h1 className="text-xl font-extrabold text-foreground">Registration Details</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Applies to {scheduleCount === 1 ? 'your selected game' : `all ${scheduleCount} selected games`}
          </p>
        </motion.div>

        {/* ── Section: Registration Mode ── */}
        <motion.div
          initial={hasAnimated.current ? false : 'hidden'}
          animate="visible"
          variants={fadeUpVariants}
          custom={1}
          className="mb-5"
        >
          <div className="border border-border rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Registration Mode</p>
            <div className="flex gap-2">
              {(['solo', 'group', 'team'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors cursor-pointer capitalize ${
                    mode === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Section: Position (Solo) ── */}
        {mode === 'solo' && (
          <motion.div
            initial={hasAnimated.current ? false : 'hidden'}
            animate="visible"
            variants={fadeUpVariants}
            custom={2}
            className="mb-5"
          >
            <div className="border border-border rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Your Position</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'open_spiker' as const, label: 'Open Spiker' },
                  { value: 'opposite_spiker' as const, label: 'Opposite Spiker' },
                  { value: 'middle_blocker' as const, label: 'Middle Blocker' },
                  { value: 'setter' as const, label: 'Setter' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setPosition(opt.value)}
                    role="radio"
                    aria-checked={position === opt.value}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setPosition(opt.value) }}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                      position === opt.value
                        ? 'bg-primary/10 border-primary'
                        : 'bg-background border-border hover:border-primary/40'
                    }`}
                  >
                    <div className={`h-3.5 w-3.5 rounded-full border-2 shrink-0 ${
                      position === opt.value ? 'bg-primary border-primary' : 'border-muted-foreground'
                    }`} />
                    <span className={`text-sm font-medium ${position === opt.value ? 'text-primary' : 'text-foreground'}`}>
                      {opt.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Section: Players (Group mode) ── */}
        {mode === 'group' && (
          <motion.div
            initial={hasAnimated.current ? false : 'hidden'}
            animate="visible"
            variants={fadeUpVariants}
            custom={2}
            className="mb-5"
          >
            <div className="border border-border rounded-xl p-4 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Players</p>
                <p className="text-xs text-muted-foreground mt-0.5">2–5 players · setter/opposite max 1 · MB/OS max 2</p>
              </div>
              <div className="space-y-2">
                {groupPlayers.map((player, idx) => {
                  const isPrimary = idx === 0
                  return (
                    <Card key={player.id} className="p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{player.first_name} {player.last_name}{isPrimary && ' (You)'}</p>
                          {player.type === 'guest' && <p className="text-xs text-muted-foreground">{player.email}</p>}
                        </div>
                        {!isPrimary && (
                          <button onClick={() => handleRemoveGroupPlayer(player.id)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Position</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(['open_spiker', 'opposite_spiker', 'middle_blocker', 'setter'] as const).map(pos => (
                            <button
                              key={pos}
                              onClick={() => handleUpdateGroupPlayerPosition(player.id, pos)}
                              className={`p-2 rounded text-xs font-medium text-center transition-colors cursor-pointer ${
                                player.preferred_position === pos
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted hover:bg-muted/80 text-foreground'
                              }`}
                            >
                              {POSITION_LABELS[pos]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
              <button
                onClick={() => setShowAddPlayerForm(!showAddPlayerForm)}
                className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline"
              >
                <Plus className="h-4 w-4" />
                {showAddPlayerForm ? 'Cancel' : 'Add Player'}
              </button>
              <AnimatePresence>
                {showAddPlayerForm && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <Card className="p-4 space-y-3">
                      <div className="flex gap-2">
                        <Button variant={newPlayerForm.type === 'existing' ? 'default' : 'outline'} size="sm" onClick={() => setNewPlayerForm(p => ({ ...p, type: 'existing' }))}>Existing Player</Button>
                        <Button variant={newPlayerForm.type === 'guest' ? 'default' : 'outline'} size="sm" onClick={() => setNewPlayerForm(p => ({ ...p, type: 'guest' }))}>Guest</Button>
                      </div>
                      {newPlayerForm.type === 'existing' ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={e => handleSearchUsers(e.target.value)} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                            {searching && <p className="text-xs text-muted-foreground mt-1">Searching...</p>}
                          </div>
                          {searchResults.length > 0 && (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {searchResults.map(result => (
                                <button key={result.id} onClick={() => handleAddExistingPlayer(result)} className="w-full text-left p-2 rounded hover:bg-muted text-sm transition-colors">
                                  <p className="font-medium">{result.first_name} {result.last_name}</p>
                                  <p className="text-xs text-muted-foreground">{result.email}</p>
                                </button>
                              ))}
                            </div>
                          )}
                          {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                            <p className="text-xs text-muted-foreground text-center py-2">No players found</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input type="text" placeholder="First name" value={newPlayerForm.first_name} onChange={e => setNewPlayerForm(p => ({ ...p, first_name: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <input type="text" placeholder="Last name" value={newPlayerForm.last_name} onChange={e => setNewPlayerForm(p => ({ ...p, last_name: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <input type="email" placeholder="Email" value={newPlayerForm.email} onChange={e => setNewPlayerForm(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <input type="text" placeholder="Gender" value={newPlayerForm.gender || ''} onChange={e => setNewPlayerForm(p => ({ ...p, gender: e.target.value || null }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <select value={newPlayerForm.skill_level || ''} onChange={e => setNewPlayerForm(p => ({ ...p, skill_level: e.target.value || null }))} className="w-full px-3 py-2 text-sm border rounded bg-background">
                            <option value="">Select skill level</option>
                            <option value="developmental">Developmental</option>
                            <option value="developmental_plus">Developmental+</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="intermediate_plus">Intermediate+</option>
                            <option value="advanced">Advanced</option>
                          </select>
                          <input type="tel" placeholder="Phone (optional)" value={newPlayerForm.phone} onChange={e => setNewPlayerForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <Button className="w-full" size="sm" onClick={handleAddGuestPlayer}>Add Guest Player</Button>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── Section: Team Members ── */}
        {mode === 'team' && (
          <motion.div
            initial={hasAnimated.current ? false : 'hidden'}
            animate="visible"
            variants={fadeUpVariants}
            custom={2}
            className="mb-5"
          >
            <div className="border border-border rounded-xl p-4 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Team Members</p>
                <p className="text-xs text-muted-foreground mt-0.5">Minimum 6 · 1 Setter + 2 MB + 2 OS + 1 OPP</p>
              </div>
              <div className="space-y-2">
                {groupPlayers.map((player, idx) => {
                  const isPrimary = idx === 0
                  return (
                    <Card key={player.id} className="p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{player.first_name} {player.last_name}{isPrimary && ' (You)'}</p>
                          {player.type === 'guest' && <p className="text-xs text-muted-foreground">{player.email}</p>}
                        </div>
                        {!isPrimary && (
                          <button onClick={() => handleRemoveGroupPlayer(player.id)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Position</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(['open_spiker', 'opposite_spiker', 'middle_blocker', 'setter'] as const).map(pos => (
                            <button
                              key={pos}
                              onClick={() => handleUpdateGroupPlayerPosition(player.id, pos)}
                              className={`p-2 rounded text-xs font-medium text-center transition-colors cursor-pointer ${
                                player.preferred_position === pos
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted hover:bg-muted/80 text-foreground'
                              }`}
                            >
                              {POSITION_LABELS[pos]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
              <button
                onClick={() => setShowAddPlayerForm(!showAddPlayerForm)}
                className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline"
              >
                <Plus className="h-4 w-4" />
                {showAddPlayerForm ? 'Cancel' : 'Add Member'}
              </button>
              <AnimatePresence>
                {showAddPlayerForm && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <Card className="p-4 space-y-3">
                      <div className="flex gap-2">
                        <Button variant={newPlayerForm.type === 'existing' ? 'default' : 'outline'} size="sm" onClick={() => setNewPlayerForm(p => ({ ...p, type: 'existing' }))}>Existing Player</Button>
                        <Button variant={newPlayerForm.type === 'guest' ? 'default' : 'outline'} size="sm" onClick={() => setNewPlayerForm(p => ({ ...p, type: 'guest' }))}>Guest</Button>
                      </div>
                      {newPlayerForm.type === 'existing' ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={e => handleSearchUsers(e.target.value)} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                            {searching && <p className="text-xs text-muted-foreground mt-1">Searching...</p>}
                            {searchResults.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded shadow-lg z-50">
                                {searchResults.map(result => (
                                  <button key={result.id} onClick={() => handleAddExistingPlayer(result)} className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0 transition-colors">
                                    <p className="font-medium">{result.first_name} {result.last_name}</p>
                                    <p className="text-xs text-muted-foreground">{result.email}</p>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input type="text" placeholder="First name" value={newPlayerForm.first_name} onChange={e => setNewPlayerForm(p => ({ ...p, first_name: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <input type="text" placeholder="Last name" value={newPlayerForm.last_name} onChange={e => setNewPlayerForm(p => ({ ...p, last_name: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <input type="email" placeholder="Email" value={newPlayerForm.email} onChange={e => setNewPlayerForm(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <input type="text" placeholder="Gender" value={newPlayerForm.gender || ''} onChange={e => setNewPlayerForm(p => ({ ...p, gender: e.target.value || null }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <select value={newPlayerForm.skill_level || ''} onChange={e => setNewPlayerForm(p => ({ ...p, skill_level: e.target.value || null }))} className="w-full px-3 py-2 text-sm border rounded bg-background">
                            <option value="">Select skill level</option>
                            <option value="developmental">Developmental</option>
                            <option value="developmental_plus">Developmental+</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="intermediate_plus">Intermediate+</option>
                            <option value="advanced">Advanced</option>
                          </select>
                          <input type="tel" placeholder="Phone (optional)" value={newPlayerForm.phone} onChange={e => setNewPlayerForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <Button className="w-full" size="sm" onClick={handleAddGuestPlayer}>Add Guest Member</Button>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Position requirements checklist */}
              <Card className="p-4 space-y-3 border-yellow-500/30 bg-yellow-500/5">
                <p className="text-sm font-medium">Team Position Requirements</p>
                {(() => {
                  const counts = countPositions(groupPlayers)
                  return (
                    <div className="space-y-2">
                      {Object.entries(TEAM_REQUIRED_POSITIONS).map(([pos, req]) => {
                        const provided = counts[pos] || 0
                        const met = provided >= req
                        return (
                          <div key={pos} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{pos.replace('_', ' ')}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${met ? 'text-green-500' : 'text-yellow-500'}`}>{provided}/{req}</span>
                              {met ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-yellow-500" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
                <p className="text-xs text-muted-foreground pt-2">Extra players beyond the minimum are allowed (bench players)</p>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ── Section: Payment ── */}
        <motion.div
          initial={hasAnimated.current ? false : 'hidden'}
          animate="visible"
          variants={fadeUpVariants}
          custom={3}
          className="mb-6"
        >
          <div className="border border-border rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Payment</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPaymentChannelsModal(true)}
              className="gap-2"
            >
              <CreditCard size={16} />
              View Payment Channels ↗
            </Button>
            {paymentFile ? (
              <Card className="p-3 bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm truncate">{paymentFile.name}</p>
                </div>
                <button onClick={handleRemovePaymentFile} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </Card>
            ) : (
              <label className="block">
                <div className="border border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors text-center">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium"><span className="text-primary">Click to upload</span> your payment screenshot</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                </div>
                <input type="file" accept="image/*" onChange={handlePaymentFileChange} className="hidden" />
              </label>
            )}
          </div>
        </motion.div>
```

- [ ] **Step 2: Add the Register button inside the mobile footer bar**

Find inside the `{/* ── MOBILE: Fixed footer bar ── */}` div:
```tsx
        {/* register button — Task 5 */}
```

Replace with:
```tsx
        <Button
          onClick={handleRegister}
          disabled={
            !paymentFile ||
            isSubmitting ||
            (mode === 'solo' && !position) ||
            ((mode === 'group' || mode === 'team') && groupPlayers.some(p => !p.preferred_position)) ||
            (mode === 'team' && (() => {
              const counts = countPositions(groupPlayers)
              return Object.entries(TEAM_REQUIRED_POSITIONS).some(([pos, req]) => (counts[pos] || 0) < req)
            })())
          }
          size="sm"
        >
          {isSubmitting
            ? 'Registering...'
            : mode === 'solo'
              ? `Register → (${scheduleCount})`
              : `Register ${groupPlayers.length} →`}
        </Button>
```

- [ ] **Step 3: Verify full flow end-to-end**

```bash
npm run dev
```

Checklist:
- Desktop ≥1024px: cart sidebar left, form right, Register button in sidebar
- Add a second game via sidebar expand — total updates
- Remove non-primary game — disappears from sidebar
- Solo mode: position grid appears, Register activates after position + payment
- Group mode: player cards render, Add Player form works
- Team mode: checklist renders
- Payment upload shows filename
- Mobile <1024px: nav bar + footer bar visible, form scrolls
- Tap cart badge — modal opens with game list
- Tap Done — modal closes

- [ ] **Step 4: Run lint**

```bash
cd /Users/christianmercado/Documents/Work/Personal/game-reservation && npm run lint 2>&1 | tail -30
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/register/\[scheduleId\]/register-client.tsx
git commit -m "feat(register): complete split panel redesign — form panel, mobile footer, payment section"
```

---

## Verification Checklist

After all tasks, run through the spec verification steps:

```bash
npm run dev
# Open http://localhost:3000/register/<valid-scheduleId>
```

1. Desktop ≥1024px: split layout, dark navy cart left, white form right
2. Add second game via sidebar inline expand → appears in cart, total updates
3. Remove game via ✕ → disappears, total updates
4. Mobile <1024px: single-column, footer bar visible
5. Tap `₱ ▸` cart badge → bottom sheet opens
6. Solo mode → position grid shows → select position → Register activates after payment upload
7. Group mode → player list expands correctly, Add Player works
8. Team mode → position requirements checklist visible
9. Upload payment screenshot → filename shown, file remove works
10. Submit → success screen
11. `npm run lint` → no errors
