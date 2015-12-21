function syntax_tree_visualize(syntax_tree) {
    // Для начала создадим div, внутри него будут такие же div
    // с другими деревьями, но они в начале будут скрыты
    // Корневой div можно развернуть, (заголовок блока -- ссылка, по
    // нажатию на который внутренний блок сворачивается/разворачивается

    // {name : lol, childs: [], state : st, [lex : ololo]}

    var main_div = document.createElement('div');
    var main_header = document.createElement('a');
    var childs_div = document.createElement('div');
    childs_div.className = "tree_child_list unvisible";

    //childs_div.appendChild(document.createTextNode("LOL"));
    for (var i = 0; syntax_tree.childs && i < syntax_tree.childs.length; ++i) {
        childs_div.appendChild(syntax_tree_visualize(syntax_tree.childs[i]));
    }

    if (syntax_tree.childs && syntax_tree.childs.length != 0) {
        main_header.style.color = "#55c";
    }

    main_header.appendChild(document.createTextNode(syntax_tree.name));
    if (syntax_tree.lex) {
        if (!syntax_tree.lex.value) {
            //main_header.appendChild(document.createTextNode(" " + syntax_tree.lex));
        } else {
            main_header.appendChild(document.createTextNode(" " + syntax_tree.lex.value[1]));
        }
    }

    if (syntax_tree.type) {
        main_header.appendChild(document.createTextNode(" " + syntax_tree.type));
    }
    main_header.onclick = (function() {
        childs_div.classList.toggle("unvisible");

        // Для всех лексем в обоих списках с лексеми переключу hover_class
        for (var key in hash_lexem_visualisation) {
            var lex_DOM = hash_lexem_visualisation[key];
            if (lex_DOM.table_lex && lex_DOM.visual_lex) {
                lex_DOM.table_lex.classList.remove("hover_class");
                lex_DOM.visual_lex.classList.remove("hover_class");
            }
        }

        (function dfs(syntax_tree) {
            for (var i = 0; syntax_tree.childs && i < syntax_tree.childs.length; ++i) {
                dfs(syntax_tree.childs[i]);
            }

            if (syntax_tree.lex) {
                var dom_lexems = hash_lexem_visualisation[syntax_tree.lex.string + "|" + syntax_tree.lex.position];
                dom_lexems.table_lex.classList.add("hover_class");
                dom_lexems.visual_lex.classList.add("hover_class");
            }
        })(syntax_tree);
    });

    main_div.appendChild(main_header);
    main_div.appendChild(childs_div);

    return main_div;
}