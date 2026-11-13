public class MyPage : View {

    readonly State<int> clickCount = new State<int> (1);

    public MyPage() {
        Body = () => new VStack {
            new Text (() => $"Click Count: {clickCount}"),
            new Button("Update Text", () => {
                clickCount.Value++;
            }
        };
    }
}
