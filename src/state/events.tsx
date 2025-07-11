import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useSyncExternalStore,
  useRef,
} from "react";

export class EventBus {
  private events: Record<string, (() => void)[]> = {};

  public emit(event: string) {
    for (
      let callbacks = this.events[event] || [],
        i = 0,
        length = callbacks.length;
      i < length;
      i++
    ) {
      callbacks[i]();
    }
  }

  public on(event: string, callback: () => void): () => void {
    (this.events[event] ||= []).push(callback);
    return () => {
      this.events[event] = this.events[event]?.filter((i) => callback !== i);
    };
  }

  public clear() {
    this.events = {};
  }
}

export function useEventBus<T>(
  eventBus: EventBus,
  event: string,
  callback: () => T
): T {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return eventBus.on(event, () => {
      setTick((t) => t + 1);
    });
  }, [event, eventBus]);

  const selected = useMemo(() => callback(), [tick]);

  return selected;
}

export function useEventBusDynamic<T>(
  eventBus: EventBus,
  callback: (events: string[]) => T,
  deps: React.DependencyList = []
): T {
  const [tick, setTick] = useState(0);

  const [selected, rawEvents] = useMemo(() => {
    const keys: string[] = [];
    const result = callback(keys);
    return [result, keys] as const;
  }, [tick, ...deps]);

  const events = Array.from(new Set(rawEvents)).sort();

  useEffect(() => {
    const unbinders = events.map((event) =>
      eventBus.on(event, () => setTick((t) => t + 1))
    );
    return () => unbinders.forEach((unbind) => unbind());
  }, [JSON.stringify(events), eventBus]);

  return selected;
}

export function useEventBusDynamic2<T>(
  eventBus: EventBus,
  callback: () => [T, string[]],
  deps: React.DependencyList = []
): T {
  const [tick, setTick] = useState(0);

  const [selected, rawEvents] = useMemo(() => {
    return callback();
  }, [tick, ...deps]);

  const events = Array.from(new Set(rawEvents)).sort();

  useEffect(() => {
    const unbinders = events.map((event) =>
      eventBus.on(event, () => setTick((t) => t + 1))
    );
    return () => unbinders.forEach((unbind) => unbind());
  }, [events.join("|"), eventBus]);

  return selected;
}
