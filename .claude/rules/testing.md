# Testing Rules

## Scope
Applied globally with `alwaysApply: true`.

## Core Testing Principles

**Behavior Over Implementation**
- Write tests that verify behavior, not implementation details.
- One assertion per test. If the name needs "and", split it.
- Never `expect(true)` or assert a mock was called without checking its arguments.

**Test Structure**
- Test names describe behavior: `should return empty array when input is empty`, not `test1`.
- Arrange-Act-Assert structure. No logic (if/loops) in tests.
- Use consistent test naming patterns for readability.

**Mocking & Isolation**
- Prefer real implementations over mocks. Only mock at system boundaries (network, filesystem, clock).
- When mocking, verify the mock's arguments and return values, not just that it was called.

**Feedback & Debugging**
- Run the specific test file after changes, not the full suite — faster feedback.
- If a test is flaky, fix or delete it. Never retry to make it pass.
- Include clear error messages to help identify why tests fail.

**Test Coverage**
- Test both happy paths and error cases.
- Test edge cases (empty inputs, boundary values, null/undefined).
- Test integration points thoroughly (API calls, database interactions).
