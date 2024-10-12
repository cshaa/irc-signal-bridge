export class EventTarget<EventMap> {
  private eventListeners: {
    [Event in keyof EventMap]?: Set<(payload: EventMap[Event]) => void>;
  } = {};
  addEventListener<Event extends keyof EventMap>(
    event: Event,
    callback: (request: EventMap[Event]) => void
  ) {
    this.eventListeners[event] ??= new Set();
    this.eventListeners[event].add(callback);
  }
  removeEventListener<Event extends keyof EventMap>(
    event: Event,
    callback: (request: EventMap[Event]) => void
  ) {
    this.eventListeners[event] ??= new Set();
    this.eventListeners[event].delete(callback);
  }
  dispatchEvent<Event extends keyof EventMap>(
    event: Event,
    payload: EventMap[Event]
  ) {
    this.eventListeners[event] ??= new Set();
    for (const f of this.eventListeners[event]!) f(payload);
  }
  once<Event extends keyof EventMap>(
    event: Event,
    filter: (payload: EventMap[Event]) => boolean = () => true
  ): Promise<EventMap[Event]> {
    const self = this;
    return new Promise((res) => {
      self.addEventListener(event, callback);
      function callback(value: EventMap[Event]) {
        if (filter(value)) {
          res(value);
          self.removeEventListener(event, callback);
        }
      }
    });
  }
}
