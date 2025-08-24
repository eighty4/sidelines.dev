import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GraphqlResponses } from './graphQuerying.ts'

test('GraphqlResponses matches no vars', () => {
    const responses = new GraphqlResponses()
    responses.addQueryResponse('ViewerLogin', null, {
        viewer: { login: 'eighty4' },
    })
    const response = responses.resolveQueryResponse(
        `query ViewerLogin { viewer }`,
        null,
    )
    assert.deepEqual(response, {
        viewer: { login: 'eighty4' },
    })
})

test('GraphqlResponses matches vars', () => {
    const responses = new GraphqlResponses()
    responses.addQueryResponse(
        'ViewerRepoExists',
        { repo: 'changelog' },
        {
            viewer: { repository: { nameWithOwner: 'eighty4/changelog' } },
        },
    )
    const response = responses.resolveQueryResponse(
        `query ViewerRepoExists { viewer }`,
        { repo: 'changelog' },
    )
    assert.deepEqual(response, {
        viewer: { repository: { nameWithOwner: 'eighty4/changelog' } },
    })
})
