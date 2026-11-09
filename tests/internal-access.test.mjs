import assert from 'node:assert/strict'
import test from 'node:test'
import { hasInternalAccess } from '../src/lib/internal-access.ts'

test('only the boolean entitlement in administrator-managed metadata grants internal use', () => {
  assert.equal(hasInternalAccess({ app_metadata: { festmatch_internal_access: true } }), true)
  for (const flag of [undefined, null, false, 'true', 1]) {
    assert.equal(hasInternalAccess({
      app_metadata: { festmatch_internal_access: flag },
      user_metadata: { festmatch_internal_access: true },
    }), false)
  }
})
