export default async function retryUntilCondition<T>(
    delay: number,
    interval: number,
    timeout: number,
    fn: () => Promise<T | undefined>,
): Promise<T> {
    await new Promise(res => setTimeout(res, delay))
    timeout -= delay
    let result: T | undefined
    while (typeof (result = await fn()) === 'undefined') {
        await new Promise(res => setTimeout(res, interval))
        timeout -= interval
        if (timeout <= 0) {
            throw Error('timed out retrying operation')
        }
    }
    return result
}
