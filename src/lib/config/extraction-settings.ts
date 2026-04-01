export function getExtractionSetting(): { enabled: boolean } {
  return { enabled: process.env.AI_EXTRACTION_ENABLED !== 'false' }
}
