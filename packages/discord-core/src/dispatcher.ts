import type { NormalizedEvent } from "@discord-bot/shared";

export interface EventHandler {
  name: string;
  handle: (event: NormalizedEvent) => Promise<void> | void;
}

export interface HandlerError {
  event: NormalizedEvent;
  handlerName: string;
  error: unknown;
  receivedAt: Date;
}

export interface EventDispatcher {
  dispatch: (event: NormalizedEvent) => void;
  register: (handler: EventHandler) => void;
  handlerCount: () => number;
}

export interface EventDispatcherOptions {
  handlers?: EventHandler[];
  onHandlerError?: (error: HandlerError) => Promise<void> | void;
}

export function createEventDispatcher(
  options: EventDispatcherOptions = {}
): EventDispatcher {
  const handlers = [...(options.handlers ?? [])];
  const onHandlerError = options.onHandlerError ?? defaultHandlerErrorReporter;

  return {
    dispatch(event) {
      for (const handler of handlers) {
        void Promise.resolve()
          .then(() => handler.handle(event))
          .catch((error: unknown) =>
            onHandlerError({
              event,
              handlerName: handler.name,
              error,
              receivedAt: new Date()
            })
          );
      }
    },

    register(handler) {
      handlers.push(handler);
    },

    handlerCount() {
      return handlers.length;
    }
  };
}

function defaultHandlerErrorReporter(error: HandlerError) {
  console.error("event handler failed", {
    eventName: error.event.eventName,
    handlerName: error.handlerName,
    receivedAt: error.receivedAt,
    error: error.error,
  });
}
