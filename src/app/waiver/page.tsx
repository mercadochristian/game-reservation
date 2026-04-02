'use client'

export default function WaiverPage() {
  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Waiver & Release Agreement
          </h1>
          <p className="text-muted-foreground">
            Please read carefully before registering for any games.
          </p>
        </div>

        {/* Content */}
        <div className="bg-card rounded-lg p-6 sm:p-8 space-y-6 text-card-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-3">Assumption of Risk</h2>
            <p className="text-sm leading-relaxed">
              By participating in volleyball games organized through this platform, you acknowledge that you are aware of and assume all risks associated with playing volleyball, including but not limited to potential injuries such as sprains, strains, fractures, collisions, and other physical contact-related injuries.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Release of Liability</h2>
            <p className="text-sm leading-relaxed">
              You hereby release and hold harmless the game organizers, venue owners, coaches, instructors, and all other parties involved in organizing these games from any and all claims, damages, or liabilities arising from your participation in volleyball games, whether caused by negligence or otherwise, to the fullest extent permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Medical Authorization</h2>
            <p className="text-sm leading-relaxed">
              You confirm that you are in good physical health and have no medical conditions that would prevent you from safely participating in volleyball. In the event of an emergency, you authorize emergency medical personnel to provide necessary treatment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Photo & Video Release</h2>
            <p className="text-sm leading-relaxed">
              You grant permission for photographs and videos taken during games to be used for promotional and educational purposes by the organizers, unless you notify the organizers in writing of your objection.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Acknowledgment</h2>
            <p className="text-sm leading-relaxed">
              By clicking the Register button, you acknowledge that you have read this waiver agreement, understand its terms, and agree to be bound by all of its provisions. You certify that you are at least 18 years of age, or if under 18, have obtained parental or guardian consent.
            </p>
          </section>

          <div className="border-t border-border pt-6 mt-6">
            <p className="text-xs text-muted-foreground italic">
              ⚠️ <strong>Note:</strong> This waiver agreement is a placeholder and will be updated. Content is subject to change based on client requirements and legal review. Please check back for the final version.
            </p>
          </div>
        </div>

        {/* Back button */}
        <div className="mt-8">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  )
}
