'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { onboardingSchema, type OnboardingFormData } from '@/lib/validations/profile'

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

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGenderPreset, setSelectedGenderPreset] = useState<string | null>(null)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      gender: '',
    },
  })

  const genderValue = watch('gender')

  // When user types in gender input, deselect any preset
  const handleGenderChange = (value: string) => {
    setValue('gender', value)
    if (!GENDER_PRESETS.includes(value)) {
      setSelectedGenderPreset(null)
    }
  }

  // When user clicks a preset chip, set gender value and mark preset as selected
  const handleGenderPresetClick = (preset: string) => {
    setValue('gender', preset)
    setSelectedGenderPreset(preset)
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Welcome to Dreamers Volleyball Club</CardTitle>
          <CardDescription>Complete your profile to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Birthday Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Date of Birth</h3>
              <div className="grid grid-cols-3 gap-4">
                {/* Month */}
                <div className="space-y-1">
                  <Label htmlFor="month">Month</Label>
                  <Select {...register('birthday_month', { setValueAs: (v) => v === '' ? null : Number(v) })}>
                    <option value="">Select month</option>
                    {MONTHS.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                  {errors.birthday_month && (
                    <p className="text-xs text-red-500">{errors.birthday_month.message}</p>
                  )}
                </div>

                {/* Day */}
                <div className="space-y-1">
                  <Label htmlFor="day">Day</Label>
                  <Select {...register('birthday_day', { setValueAs: (v) => v === '' ? null : Number(v) })}>
                    <option value="">Select day</option>
                    {DAYS.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                  {errors.birthday_day && (
                    <p className="text-xs text-red-500">{errors.birthday_day.message}</p>
                  )}
                </div>

                {/* Year */}
                <div className="space-y-1">
                  <Label htmlFor="year">Year (Optional)</Label>
                  <Input
                    id="year"
                    type="number"
                    placeholder="Optional"
                    {...register('birthday_year', {
                      setValueAs: (v) => v === '' || v === null ? null : Number(v)
                    })}
                  />
                  {errors.birthday_year && (
                    <p className="text-xs text-red-500">{errors.birthday_year.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Gender Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Gender</h3>

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-2">
                {GENDER_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleGenderPresetClick(preset)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedGenderPreset === preset
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Free Text Input */}
              <div className="space-y-1">
                <Label htmlFor="gender">Or specify your own</Label>
                <Input
                  id="gender"
                  type="text"
                  placeholder="e.g., Genderqueer, Two-spirit, etc."
                  value={genderValue || ''}
                  onChange={(e) => handleGenderChange(e.target.value)}
                />
                {errors.gender && (
                  <p className="text-xs text-red-500">{errors.gender.message}</p>
                )}
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold text-gray-900">Emergency Contact</h3>
              <p className="text-sm text-gray-600">Required, but can be edited later.</p>

              <div className="space-y-1">
                <Label htmlFor="ec-name">Contact Name</Label>
                <Input
                  id="ec-name"
                  type="text"
                  placeholder="Full name"
                  {...register('emergency_contact_name')}
                />
                {errors.emergency_contact_name && (
                  <p className="text-xs text-red-500">{errors.emergency_contact_name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="ec-relationship">Relationship</Label>
                <Input
                  id="ec-relationship"
                  type="text"
                  placeholder="e.g., Parent, Sibling, Friend"
                  {...register('emergency_contact_relationship')}
                />
                {errors.emergency_contact_relationship && (
                  <p className="text-xs text-red-500">{errors.emergency_contact_relationship.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="ec-number">Contact Number</Label>
                <Input
                  id="ec-number"
                  type="tel"
                  placeholder="Phone number"
                  {...register('emergency_contact_number')}
                />
                {errors.emergency_contact_number && (
                  <p className="text-xs text-red-500">{errors.emergency_contact_number.message}</p>
                )}
              </div>
            </div>

            {/* Skill Level Section */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold text-gray-900">Skill Level</h3>
              <p className="text-sm text-gray-600">Select your current level. Admins and facilitators will confirm this after seeing you play.</p>

              <div className="space-y-1">
                <Label htmlFor="skill">Skill Level</Label>
                <Select {...register('skill_level')}>
                  <option value="">Select skill level</option>
                  {SKILL_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label} — {level.description}
                    </option>
                  ))}
                </Select>
                {errors.skill_level && (
                  <p className="text-xs text-red-500">{errors.skill_level.message}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 border-t pt-6">
              <Button
                type="submit"
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Completing Profile...' : 'Complete Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
