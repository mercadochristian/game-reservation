# Future Features

A backlog of planned enhancements and capabilities for the Volleyball Game Reservation System.

## Promotions

- Offer BOTO (Buy One Take One) or discounts to specific game schedules
- Admin-controlled: set discount percentage or fixed amount
- Display on schedule card during registration
- Apply discount automatically to registration total

## Announcements

- Admins can create and broadcast announcements to users
- Users receive real-time notifications
- Announcement center/history in user dashboard
- Target by role (admin-only, facilitator-specific, all players)

## Webhooks

- External system integration via webhook events
- Events: registration created, payment verified, game attendance marked, etc.
- Enable third-party integrations and monitoring systems

## PWA (Progressive Web App)

- Installable app experience on mobile devices
- Offline capability for core features
- Push notifications for announcements and registration reminders

## Facilitator QR Scanner

- Facilitators scan player QR codes at game start
- Updates registration status: mark attendance
- Flag pending payments at scan time
- Real-time roster and payment status on game day
- Requires: QR code generation for each registered player

## Waiver During Registration

- Display and collect digital waiver signature during registration
- Data privacy notice during profile completion
- Store waiver acceptance and timestamp
- Compliance with legal/liability requirements

## Badge Collection & MVP Awards

- Players earn badges/medals for achievements (e.g., MVP of a game)
- Badge display on player profile and game history
- Certificate generation: downloadable/shareable when badge is clicked
- Admin ability to award badges post-game

## Registration History

- Players view all past games they registered for
- Filter by date, location, status (attended, no-show, etc.)
- Display attendance and payment confirmation for past registrations
- **Status**: Likely already implemented — verify in current codebase

---

## Implementation Priority

(To be determined based on business goals and user feedback)

### High Priority
- Facilitator QR Scanner (game-day operations)
- Registration History (player experience)
- Promotions (revenue/engagement)

### Medium Priority
- Announcements (communication)
- Badge Collection (engagement/gamification)
- Waiver (legal/compliance)

### Low Priority
- PWA (nice-to-have, can be added after MVP stabilizes)
- Webhooks (integration, depends on external systems)
