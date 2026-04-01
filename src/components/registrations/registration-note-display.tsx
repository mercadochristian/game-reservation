'use client'

interface RegistrationNoteDisplayProps {
  note: string | null | undefined
}

export function RegistrationNoteDisplay({ note }: RegistrationNoteDisplayProps) {
  if (!note || note.trim() === '') {
    return null
  }

  return (
    <div className="mt-3 space-y-1">
      <p className="text-xs font-medium text-foreground">Your note:</p>
      <p
        data-testid="note-text"
        className="text-sm text-muted-foreground break-words"
      >
        {note}
      </p>
    </div>
  )
}
