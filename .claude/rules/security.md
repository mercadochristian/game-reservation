# Security Rules

## Scope
Applied to `src/api/**`, `src/auth/**`, `src/middleware/**`, `**/routes/**`, and `**/controllers/**`.

## Core Requirements

**Input Validation**
- Validate all user input at the system boundary. Never trust request parameters.
- Use parameterized queries — never concatenate user input into SQL or shell commands.

**Output Sanitization**
- Sanitize output to prevent XSS. Use framework-provided escaping.
- Never expose stack traces, internal paths, or raw database errors in production responses.

**Authentication & Tokens**
- Authentication tokens must be short-lived. Store refresh tokens server-side only.
- Use constant-time comparison for secrets and tokens.
- Rate-limit authentication endpoints.

**Secrets & Logging**
- Never log secrets, tokens, passwords, or PII.
- Avoid logging sensitive information in error messages.

**Headers & CORS**
- Set appropriate CORS, CSP, and security headers.
- Validate origin headers for sensitive operations.

**Data Protection**
- Use HTTPS for all communications containing user data.
- Encrypt sensitive data at rest when applicable.
