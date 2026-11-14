const store = createStore({
  context: { count: 0 },
  on: {
    incrementDelayed: (context, event, enqueue) => {
      enqueue.effect(() => {
        setTimeout(() => {
          store.trigger.increment();
        }, 1000);
      });

      return context;
    },
    increment: (context) => ({
      count: context.count + 1,
    }),
  },
});
