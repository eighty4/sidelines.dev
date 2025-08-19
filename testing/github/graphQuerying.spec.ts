import { expect, test } from 'bun:test'
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
    expect(response).toStrictEqual({
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
    expect(response).toStrictEqual({
        viewer: { repository: { nameWithOwner: 'eighty4/changelog' } },
    })
})
