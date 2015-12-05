func main() {
    var i int
    for i = 0; i <= 10; i = i + 1 {
        // Тут что то есть
        var j int
        j = i * i
        if (j < 25) {
            fmt.Print("i < 5")
        } else {
            fmt.Print("i >= 5")
        }
    }
}
