import assert from 'node:assert/strict'
import { suite, test } from 'node:test'
import { fromEncodedValue, type EncodedValue } from './idbEncodedValue.ts'

suite('fromEncodedValue', () => {
    suite('records', () => {
        test('of simple values', () => {
            const valueEncoded: EncodedValue = {
                o: [
                    {
                        k: 'chicken',
                        v: 'Walter Boggis',
                    },
                    {
                        k: 'fowl',
                        v: 'Nathan Bunce',
                    },
                    {
                        k: 'turkey',
                        v: 'Franklin Bean',
                    },
                ],
                id: 1,
            }
            assert.deepEqual(fromEncodedValue(valueEncoded), {
                chicken: 'Walter Boggis',
                fowl: 'Nathan Bunce',
                turkey: 'Franklin Bean',
            })
        })
        test('of nulls and undefined', () => {
            const valueEncoded: EncodedValue = {
                o: [
                    {
                        k: 'elven-bread',
                        v: {
                            v: 'null',
                        },
                    },
                    {
                        k: 'orange-marmalade',
                        v: {
                            v: 'undefined',
                        },
                    },
                ],
                id: 1,
            }
            assert.deepEqual(fromEncodedValue(valueEncoded), {
                'elven-bread': null,
                'orange-marmalade': undefined,
            })
        })
        test('of encoded values', () => {
            const valueEncoded: EncodedValue = {
                o: [
                    {
                        k: 'ragnarok',
                        v: {
                            d: '2029-04-15T12:43:30.500Z',
                        },
                    },
                    {
                        k: 'y2k',
                        v: {
                            a: ['baloney', 'poppycock', 'hogwash', 'malarkey'],
                            id: 2,
                        },
                    },
                    {
                        k: 'letdowns',
                        v: {
                            o: [
                                {
                                    k: 'google-io',
                                    v: true,
                                },
                                {
                                    k: 'wwdc',
                                    v: true,
                                },
                            ],
                            id: 3,
                        },
                    },
                ],
                id: 1,
            }
            assert.deepEqual(fromEncodedValue(valueEncoded), {
                letdowns: {
                    'google-io': true,
                    wwdc: true,
                },
                ragnarok: new Date('2029-04-15T12:43:30.500Z'),
                y2k: ['baloney', 'poppycock', 'hogwash', 'malarkey'],
            })
        })
        test('preserve refs', () => {
            const valueEncoded: EncodedValue = {
                o: [
                    {
                        k: 'bigEmpty',
                        v: {
                            o: [],
                            id: 2,
                        },
                    },
                    {
                        k: 'alsoBigAndEmptyFromMoreThanOneAngle',
                        v: {
                            ref: 2,
                        },
                    },
                ],
                id: 1,
            }
            const decoded = fromEncodedValue(valueEncoded)
            assert.ok(
                decoded.bigEmpty ===
                    decoded.alsoBigAndEmptyFromMoreThanOneAngle,
            )
        })
    })
    suite('arrays', () => {
        test('of simple values', () => {
            const valueEncoded: EncodedValue = {
                a: ['black', 'gray', 'grey', 'white'],
                id: 1,
            }
            assert.deepEqual(fromEncodedValue(valueEncoded), [
                'black',
                'gray',
                'grey',
                'white',
            ])
        })
        test('of encoded values', () => {
            const valueEncoded: EncodedValue = {
                a: [
                    {
                        d: '2026-07-04T19:08:54.977Z',
                    },
                    {
                        o: [
                            {
                                k: 'meeting',
                                v: 'nobody',
                            },
                        ],
                        id: 2,
                    },
                    {
                        v: 'null',
                    },
                    {
                        v: 'undefined',
                    },
                ],
                id: 1,
            }
            assert.deepEqual(fromEncodedValue(valueEncoded), [
                new Date('2026-07-04T19:08:54.977Z'),
                { meeting: 'nobody' },
                null,
                undefined,
            ])
        })
        test('preserve refs', () => {
            const valueEncoded: EncodedValue = {
                o: [
                    {
                        k: 'bigEmpty',
                        v: {
                            a: [],
                            id: 2,
                        },
                    },
                    {
                        k: 'alsoBigAndEmptyFromMoreThanOneAngle',
                        v: {
                            ref: 2,
                        },
                    },
                ],
                id: 1,
            }
            const decoded = fromEncodedValue(valueEncoded)
            assert.ok(
                decoded.bigEmpty ===
                    decoded.alsoBigAndEmptyFromMoreThanOneAngle,
            )
        })
    })
})
