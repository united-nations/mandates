import { monitorEventLoopDelay, PerformanceObserver } from 'node:perf_hooks'

function observeGc() {
  let count = 0
  let durationMs = 0
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      count++
      durationMs += entry.duration
    }
  })
  observer.observe({ entryTypes: ['gc'] })
  const take = () => {
    const sample = { count, durationMs }
    count = durationMs = 0
    return sample
  }
  return { take, stop: () => observer.disconnect() }
}

function elapsedSampler() {
  let cpu = process.cpuUsage()
  let time = performance.now()
  return () => {
    const now = performance.now()
    const nextCpu = process.cpuUsage()
    const sample = {
      elapsedMs: now - time,
      cpu: {
        user: nextCpu.user - cpu.user,
        system: nextCpu.system - cpu.system,
      },
    }
    cpu = nextCpu
    time = now
    return sample
  }
}

function delaySampler() {
  const delay = monitorEventLoopDelay({ resolution: 20 })
  delay.enable()
  const take = () => {
    const sample = { p99Ms: delay.percentile(99) / 1e6, maxMs: delay.max / 1e6 }
    delay.reset()
    return sample
  }
  return { take, stop: () => delay.disable() }
}

export function createRuntimeSampler() {
  const delay = delaySampler()
  const gc = observeGc()
  const elapsed = elapsedSampler()
  return {
    sample: () => ({ ...elapsed(), eventLoop: delay.take(), gc: gc.take() }),
    stop: () => {
      delay.stop()
      gc.stop()
    },
  }
}
