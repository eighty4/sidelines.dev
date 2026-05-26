import assert from 'node:assert/strict'
import { suite, test } from 'node:test'
import * as errors from './errors.api.ts'

const NOT_ERROR_CODE = ['isFetchFailed']

const isErrorCode = (name: string) => !NOT_ERROR_CODE.includes(name)

test('export values are unique strings', () => {
    const errorCodes = Object.fromEntries(
        Object.entries(errors).filter(([name]) => isErrorCode(name)),
    )
    for (const [name, value] of Object.entries(errorCodes)) {
        assert.ok(typeof value === 'string', `expected ${name} to be a string`)
    }
    assert.equal(
        Object.keys(errorCodes).length,
        new Set(Object.values(errorCodes)).size,
        'expected unique string values',
    )
})

suite('isFetchFailed', () => {
    function testOnError(e: Error) {
        assert.ok(errors.isFetchFailed(e))
    }
    test('chromium', () => testOnError(new TypeError('Failed to fetch')))
    test('firefox', () =>
        testOnError(
            new TypeError('NetworkError when attempting to fetch resource.'),
        ))
    test('webkit', () => testOnError(new TypeError('Load failed')))
})
