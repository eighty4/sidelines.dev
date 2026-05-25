import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as errors from './errors.api.ts'

test('export values are unique strings', () => {
    for (const [name, value] of Object.entries(errors)) {
        assert.ok(typeof value === 'string', `expected ${name} to be a string`)
    }
    assert.equal(
        Object.keys(errors).length,
        new Set(Object.values(errors)).size,
        'expected unique string values',
    )
})
