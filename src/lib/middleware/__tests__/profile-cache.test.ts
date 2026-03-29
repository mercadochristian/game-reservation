import { describe, it, expect } from 'vitest'
import {
  readProfileCache,
  writeProfileCache,
  clearProfileCache,
  type ProfileData,
} from '../profile-cache'
import { createMockRequest, createMockResponse } from '@/__tests__/helpers/next-mock'

describe('profile-cache', () => {
  describe('readProfileCache', () => {
    it('decodes and returns ProfileData from valid base64 cookie', () => {
      const data: ProfileData = { role: 'admin', profile_completed: true }
      const encoded = btoa(JSON.stringify(data))
      const request = createMockRequest('/test', { cookies: { 'x-profile': encoded } })

      const result = readProfileCache(request)

      expect(result).toEqual(data)
    })

    it('returns null when cookie is absent', () => {
      const request = createMockRequest('/test')

      const result = readProfileCache(request)

      expect(result).toBeNull()
    })

    it('returns null when cookie value is empty', () => {
      const request = createMockRequest('/test', { cookies: { 'x-profile': '' } })

      const result = readProfileCache(request)

      expect(result).toBeNull()
    })

    it('returns null when base64 is invalid', () => {
      const request = createMockRequest('/test', { cookies: { 'x-profile': '!!invalid!!' } })

      const result = readProfileCache(request)

      expect(result).toBeNull()
    })

    it('returns null when base64 decodes to non-JSON', () => {
      const encoded = btoa('not json at all')
      const request = createMockRequest('/test', { cookies: { 'x-profile': encoded } })

      const result = readProfileCache(request)

      expect(result).toBeNull()
    })

    it('handles player role', () => {
      const data: ProfileData = { role: 'player', profile_completed: false }
      const encoded = btoa(JSON.stringify(data))
      const request = createMockRequest('/test', { cookies: { 'x-profile': encoded } })

      const result = readProfileCache(request)

      expect(result).toEqual(data)
    })

    it('handles facilitator role', () => {
      const data: ProfileData = { role: 'facilitator', profile_completed: true }
      const encoded = btoa(JSON.stringify(data))
      const request = createMockRequest('/test', { cookies: { 'x-profile': encoded } })

      const result = readProfileCache(request)

      expect(result).toEqual(data)
    })
  })

  describe('writeProfileCache', () => {
    it('sets x-profile cookie with correct attributes', () => {
      const data: ProfileData = { role: 'admin', profile_completed: true }
      const response = createMockResponse()

      writeProfileCache(response, data)

      const mockSet = response.cookies.set as any
      expect(mockSet).toHaveBeenCalledTimes(1)
      const [name, encoded, options] = mockSet.mock.calls[0]
      expect(name).toBe('x-profile')
      expect(encoded).toBe(btoa(JSON.stringify(data)))
      expect(options).toMatchObject({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 300,
      })
    })

    it('encodes ProfileData as base64 JSON', () => {
      const data: ProfileData = { role: 'player', profile_completed: false }
      const response = createMockResponse()

      writeProfileCache(response, data)

      const mockSet = response.cookies.set as any
      const [, encodedValue] = mockSet.mock.calls[0]
      expect(encodedValue).toBe(btoa(JSON.stringify(data)))
      expect(JSON.parse(atob(encodedValue))).toEqual(data)
    })

    it('sets httpOnly flag for security', () => {
      const data: ProfileData = { role: 'admin', profile_completed: true }
      const response = createMockResponse()

      writeProfileCache(response, data)

      const mockSet = response.cookies.set as any
      const [, , options] = mockSet.mock.calls[0]
      expect(options.httpOnly).toBe(true)
    })

    it('sets sameSite to lax', () => {
      const data: ProfileData = { role: 'admin', profile_completed: true }
      const response = createMockResponse()

      writeProfileCache(response, data)

      const mockSet = response.cookies.set as any
      const [, , options] = mockSet.mock.calls[0]
      expect(options.sameSite).toBe('lax')
    })

    it('sets path to / for all routes', () => {
      const data: ProfileData = { role: 'admin', profile_completed: true }
      const response = createMockResponse()

      writeProfileCache(response, data)

      const mockSet = response.cookies.set as any
      const [, , options] = mockSet.mock.calls[0]
      expect(options.path).toBe('/')
    })

    it('sets maxAge to 300 seconds (5 minutes)', () => {
      const data: ProfileData = { role: 'admin', profile_completed: true }
      const response = createMockResponse()

      writeProfileCache(response, data)

      const mockSet = response.cookies.set as any
      const [, , options] = mockSet.mock.calls[0]
      expect(options.maxAge).toBe(300)
    })
  })

  describe('clearProfileCache', () => {
    it('deletes x-profile cookie', () => {
      const response = createMockResponse()

      clearProfileCache(response)

      expect(response.cookies.delete).toHaveBeenCalledWith('x-profile')
    })

    it('only deletes x-profile cookie once', () => {
      const response = createMockResponse()

      clearProfileCache(response)

      expect(response.cookies.delete).toHaveBeenCalledTimes(1)
    })
  })

  describe('round-trip', () => {
    it('read and write preserve data', () => {
      const original: ProfileData = { role: 'facilitator', profile_completed: true }
      const response = createMockResponse()

      writeProfileCache(response, original)

      const [, encodedValue] = (response.cookies.set as any).mock.calls[0]
      const request = createMockRequest('/test', { cookies: { 'x-profile': encodedValue } })

      const retrieved = readProfileCache(request)

      expect(retrieved).toEqual(original)
    })
  })
})
