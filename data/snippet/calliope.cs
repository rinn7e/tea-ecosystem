await Calliope.NewProgram(new CounterProgram()).RunAsync();

public class TickUpMsg : CalliopeMsg { }

public class CounterProgram : ICalliopeProgram
{
    public int Count { get; set; }

    public CalliopeCmd? Init()
    {
        return Tick();
    }

    public CalliopeCmd? Update(CalliopeMsg msg)
    {
        if (msg is KeyPressMsg kpm)
        {
            if (kpm.Key == ConsoleKey.C && kpm.Modifiers == ConsoleModifiers.Control)
                return CalliopeCmd.Quit;

            if (kpm.Key == ConsoleKey.RightArrow)
            {
                Count = Count + 1;
                return null;
            }

            if (kpm.Key == ConsoleKey.LeftArrow)
            {
                Count = Count - 1;
                return null;
            }
        }

        if (msg is TickUpMsg)
        {
            Count = Count + 1;
            return Tick();
        }

        return null;
    }

    public string View()
    {
        return
            $"""
            Your count is currently {Count}!!
            →: Increment
            ←: Decrement
            ctrl+c: Quit
            """;
    }

    private CalliopeCmd Tick()
    {
        return CalliopeCmd.Make(async () =>
        {
            await Task.Delay(1000);
            return new TickUpMsg();
        });
    }
}
