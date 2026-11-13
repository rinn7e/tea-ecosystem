public record Arguments;
public record Model(int Count);

public record Increment : Message;
public record Decrement : Message;

public class Counter : Program<Model, Arguments>
{
    public static (Model, Command) Initialize(Arguments argument)
        => (new Model(0), Commands.None);

    public static (Model, Command) Transition(Model model, Message message)
        => message switch
        {
            Increment => (model with { Count = model.Count + 1 }, Commands.None),
            Decrement => (model with { Count = model.Count - 1 }, Commands.None),
            _ => (model, Commands.None)
        };

    public static Document View(Model model)
        => new("Counter",
            div([], [
                button([onclick(new Decrement())], [text("-")]),
                text(model.Count.ToString()),
                button([onclick(new Increment())], [text("+")])
            ]));

    public static Subscription Subscriptions(Model model) => SubscriptionModule.None;

    public static Result<Message[], Message> Decide(Model state, Message command)
        => Result<Message[], Message>.Ok([command]);

    public static bool IsTerminal(Model state) => false;
}
