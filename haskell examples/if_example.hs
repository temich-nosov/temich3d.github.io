main = do
    b <- return 1;
    (b) <- if (b == 1)
        then do
            b <- return 10;
            print b;
            return (b)
        else do
            b <- return 20;
            print b;
            return (b)
    print b;
    return ()
