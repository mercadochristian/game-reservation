'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Calendar, User, Shield, Star, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { onboardingSchema, type OnboardingFormData } from '@/lib/validations/profile'
import { branding } from '@/lib/config/branding'

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

const GENDER_PRESETS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

const SKILL_LEVELS = [
  { value: 'developmental', label: 'Developmental', description: 'Beginner, just starting out' },
  { value: 'developmental_plus', label: 'Developmental+', description: 'Learning fundamentals' },
  { value: 'intermediate', label: 'Intermediate', description: 'Comfortable with basics' },
  { value: 'intermediate_plus', label: 'Intermediate+', description: 'Consistent and competitive' },
  { value: 'advanced', label: 'Advanced', description: 'High-level play' },
]

const SECTIONS = [
  { id: 1, name: 'Birthday' },
  { id: 2, name: 'Gender' },
  { id: 3, name: 'Contact Number' },
  { id: 4, name: 'Emergency Contact' },
  { id: 5, name: 'Skill Level' },
]

interface SectionHeaderProps {
  number: number
  icon: React.ReactNode
  title: string
}

function SectionHeader({ number, icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm"
        style={{ backgroundColor: branding.colors.primary, color: 'white' }}
      >
        {number}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
    </div>
  )
}

export default function CreateProfilePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGenderPreset, setSelectedGenderPreset] = useState<string | null>(null)
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string | null>(null)
  const [playerPhoneDisplay, setPlayerPhoneDisplay] = useState('')
  const [emergencyPhoneDisplay, setEmergencyPhoneDisplay] = useState('')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      gender: '',
    },
  })

  const genderValue = watch('gender')

  const handleGenderChange = (value: string) => {
    setValue('gender', value)
    if (!GENDER_PRESETS.includes(value)) {
      setSelectedGenderPreset(null)
    }
  }

  const handleGenderPresetClick = (preset: string) => {
    setValue('gender', preset)
    setSelectedGenderPreset(preset)
  }

  const handleSkillLevelClick = (value: string) => {
    setValue('skill_level', value)
    setSelectedSkillLevel(value)
  }

  const handlePlayerPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 13)
    setPlayerPhoneDisplay(digits)
  }

  const handlePlayerPhoneBlur = () => {
    let cleaned = playerPhoneDisplay.replace(/\D/g, '')
    if (cleaned.startsWith('63')) cleaned = cleaned.slice(2)
    else if (cleaned.startsWith('0')) cleaned = cleaned.slice(1)
    cleaned = cleaned.slice(0, 10)
    setPlayerPhoneDisplay(cleaned)
    setValue('player_contact_number', cleaned ? `+63${cleaned}` : '')
  }

  const handleEmergencyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 13)
    setEmergencyPhoneDisplay(digits)
  }

  const handleEmergencyPhoneBlur = () => {
    let cleaned = emergencyPhoneDisplay.replace(/\D/g, '')
    if (cleaned.startsWith('63')) cleaned = cleaned.slice(2)
    else if (cleaned.startsWith('0')) cleaned = cleaned.slice(1)
    cleaned = cleaned.slice(0, 10)
    setEmergencyPhoneDisplay(cleaned)
    setValue('emergency_contact_number', cleaned ? `+63${cleaned}` : '')
  }

  async function onSubmit(data: OnboardingFormData) {
    setIsLoading(true)
    try {
      const response = await fetch('/api/profile/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error completing profile:', errorData)
        return
      }

      router.push('/player')
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="dark min-h-screen flex bg-background">
      {/* Left Sidebar - Desktop Only */}
      <div className="hidden lg:flex flex-col w-1/3 bg-gradient-to-b from-primary/10 to-primary/5 border-r border-border sticky top-0 h-screen overflow-y-auto">
        <div className="p-8 flex flex-col gap-8">
          {/* Brand Section */}
          <div className="text-center">
            {branding.logo && (
              <div className="flex justify-center mb-4">
                <img
                  src={branding.logo.url}
                  alt={branding.logo.altText}
                  width={branding.logo.width}
                  height={branding.logo.height}
                  className="h-16 w-auto"
                />
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground mb-2">{branding.name}</h1>
            <p className="text-muted-foreground text-sm italic">"{branding.tagline}"</p>
          </div>

          {/* Steps List */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Setup Steps</p>
            {SECTIONS.map((section) => (
              <div key={section.id} className="flex items-center gap-3 text-sm">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-medium text-xs"
                  style={{ backgroundColor: branding.colors.primary, color: 'white' }}
                >
                  {section.id}
                </div>
                <span className="text-muted-foreground">{section.name}</span>
              </div>
            ))}
          </div>

          {/* Help Text */}
          <div className="rounded-lg bg-card/50 border border-border p-4 text-sm text-muted-foreground">
            <p>You're almost there! Complete your profile in just a few steps.</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 lg:py-12 overflow-y-auto">
        <div className="w-full max-w-xl">
          {/* Mobile Brand Header */}
          <div className="lg:hidden text-center mb-8">
            {branding.logo && (
              <div className="flex justify-center mb-4">
                <img
                  src={branding.logo.url}
                  alt={branding.logo.altText}
                  width={branding.logo.width}
                  height={branding.logo.height}
                  className="h-14 w-auto"
                />
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground mb-1">{branding.name}</h1>
            <p className="text-muted-foreground text-sm italic">"{branding.tagline}"</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Birthday Section */}
            <Card className="border-border bg-card/50 p-6">
              <SectionHeader number={1} icon={<Calendar className="h-5 w-5" />} title="Date of Birth" />
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {/* Month */}
                  <div className="space-y-2">
                    <Label htmlFor="month" className="text-foreground text-xs font-medium">
                      Month
                    </Label>
                    <select
                      id="month"
                      className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...register('birthday_month', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
                    >
                      <option value="">Select</option>
                      {MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label.slice(0, 3)}
                        </option>
                      ))}
                    </select>
                    {errors.birthday_month && (
                      <p className="text-xs text-destructive">{errors.birthday_month.message}</p>
                    )}
                  </div>

                  {/* Day */}
                  <div className="space-y-2">
                    <Label htmlFor="day" className="text-foreground text-xs font-medium">
                      Day
                    </Label>
                    <select
                      id="day"
                      className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...register('birthday_day', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
                    >
                      <option value="">Select</option>
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    {errors.birthday_day && (
                      <p className="text-xs text-destructive">{errors.birthday_day.message}</p>
                    )}
                  </div>

                  {/* Year */}
                  <div className="space-y-2">
                    <Label htmlFor="year" className="text-foreground text-xs font-medium">
                      Year
                    </Label>
                    <Input
                      id="year"
                      type="number"
                      placeholder="Opt."
                      className="bg-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                      {...register('birthday_year', {
                        setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
                      })}
                    />
                    {errors.birthday_year && (
                      <p className="text-xs text-destructive">{errors.birthday_year.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Gender Section */}
            <Card className="border-border bg-card/50 p-6">
              <SectionHeader number={2} icon={<User className="h-5 w-5" />} title="Gender" />
              <div className="space-y-4">
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-2">
                  {GENDER_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleGenderPresetClick(preset)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border cursor-pointer ${
                        selectedGenderPreset === preset
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-muted text-muted-foreground border-border hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-foreground'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Free Text Input */}
                <div className="space-y-2 pt-2">
                  <Label htmlFor="gender" className="text-foreground text-sm">
                    Or specify your own
                  </Label>
                  <Input
                    id="gender"
                    type="text"
                    placeholder="e.g., Genderqueer, Two-spirit"
                    className="bg-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                    value={genderValue || ''}
                    onChange={(e) => handleGenderChange(e.target.value)}
                  />
                  {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
                </div>
              </div>
            </Card>

            {/* Player Contact Section */}
            <Card className="border-border bg-card/50 p-6">
              <SectionHeader number={3} icon={<Shield className="h-5 w-5" />} title="Your Contact Number" />
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">So we can reach you about games and updates.</p>

                <div className="space-y-2">
                  <Label htmlFor="player-number" className="text-foreground">
                    Mobile Number
                  </Label>
                  <div className="flex">
                    <span className="flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground select-none">
                      +63
                    </span>
                    <Input
                      id="player-number"
                      type="tel"
                      inputMode="numeric"
                      placeholder="9XX XXX XXXX"
                      value={playerPhoneDisplay}
                      onChange={handlePlayerPhoneChange}
                      onBlur={handlePlayerPhoneBlur}
                      className="rounded-l-none bg-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                    />
                  </div>
                  {errors.player_contact_number && (
                    <p className="text-xs text-destructive">{errors.player_contact_number.message}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Emergency Contact Section */}
            <Card className="border-border bg-card/50 p-6">
              <SectionHeader number={4} icon={<Shield className="h-5 w-5" />} title="Emergency Contact" />
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Required, but can be edited later.</p>

                <div className="space-y-2">
                  <Label htmlFor="ec-name" className="text-foreground">
                    Contact Name
                  </Label>
                  <Input
                    id="ec-name"
                    type="text"
                    placeholder="Full name"
                    className="bg-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                    {...register('emergency_contact_name')}
                  />
                  {errors.emergency_contact_name && (
                    <p className="text-xs text-destructive">{errors.emergency_contact_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ec-relationship" className="text-foreground">
                    Relationship
                  </Label>
                  <Input
                    id="ec-relationship"
                    type="text"
                    placeholder="e.g., Parent, Sibling, Friend"
                    className="bg-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                    {...register('emergency_contact_relationship')}
                  />
                  {errors.emergency_contact_relationship && (
                    <p className="text-xs text-destructive">{errors.emergency_contact_relationship.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ec-number" className="text-foreground">
                    Contact Number
                  </Label>
                  <div className="flex">
                    <span className="flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground select-none">
                      +63
                    </span>
                    <Input
                      id="ec-number"
                      type="tel"
                      inputMode="numeric"
                      placeholder="9XX XXX XXXX"
                      value={emergencyPhoneDisplay}
                      onChange={handleEmergencyPhoneChange}
                      onBlur={handleEmergencyPhoneBlur}
                      className="rounded-l-none bg-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                    />
                  </div>
                  {errors.emergency_contact_number && (
                    <p className="text-xs text-destructive">{errors.emergency_contact_number.message}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Skill Level Section */}
            <Card className="border-border bg-card/50 p-6">
              <SectionHeader number={5} icon={<Star className="h-5 w-5" />} title="Skill Level" />
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select your current level. Admins and facilitators will confirm this after seeing you play.
                </p>

                {/* Skill Cards */}
                <div className="space-y-3 pt-2">
                  {SKILL_LEVELS.map((level) => {
                    const isSelected = selectedSkillLevel === level.value
                    return (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => handleSkillLevelClick(level.value)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all text-foreground cursor-pointer ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500'
                            : 'bg-card border-border hover:bg-blue-500/5 hover:border-blue-500/30'
                        }`}
                      >
                        <div className="font-semibold">{level.label}</div>
                        <div className="text-sm text-muted-foreground mt-1">{level.description}</div>
                      </button>
                    )
                  })}
                </div>

                {errors.skill_level && (
                  <p className="text-xs text-destructive">{errors.skill_level.message}</p>
                )}
              </div>
            </Card>

            {/* Submit Button */}
            <Button
              type="submit"
              style={{ backgroundColor: branding.colors.primary }}
              className="w-full text-white font-semibold hover:opacity-90 h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing Profile...
                </>
              ) : (
                'Complete Profile'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
