const store = createStore({
  context: { count: 0 },
  on: {
    incrementDelayed: (context, event, enqueue) => {
      enqueue.effect(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        store.send({ type: 'increment' });
      });

      return context;
    },
    increment: (context) => ({
      ...context,
      count: context.count + 1
    })
  }
});
