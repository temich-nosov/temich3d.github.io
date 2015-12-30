func main() {
	var a [][]float64
	var i int
	var j int

	a = make([][]float64, 10)
	for i = 0; i < 10; i = i + 1 {
		a[i] = make([]float64, 10)
	}

	for i = 0; i < 10; i = i + 1 {
		for j = 0; j < 10; j = j + 1 {
			a[i][j] = float64(i) + float64(j) + 0.1
			fmt.Print(a[i][j])
		}
	}
}