/** 앞 작업이 실패해도 다음 작업은 이어진다 */
export function createSerialQueue(): <T>(task: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve()
  return (task) => {
    const result = tail.then(task)
    tail = result.catch(() => undefined)
    return result
  }
}
