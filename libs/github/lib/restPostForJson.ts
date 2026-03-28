import restPostForResponse from './restPostForResponse.ts'

export default async function restPostForJson(
    ghToken: string,
    url: string,
    body: any,
): Promise<any> {
    const response = await restPostForResponse(ghToken, url, body)
    return await response.json()
}
