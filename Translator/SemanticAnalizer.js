function SemanticAnalyzer() {
    // В this.tree кладется копия дерева из синтаксического анализатора
    this.tree = {};

    // Если на одной из стадий обнаружена ошибка -- флаг установить в true
    // И в this.error_info положить информацию об ошибке
    this.error = false;
    this.error_info = {};

    // Объект с описанием всех ф-ий программы
    this.functions_description = {};

    // Таблица идентификаторов
    // Объекты вида
    // {
    //   number : номер строки в таблице,
    //   ident : ident,
    //   type : ("Function"|"Var"|"Array"),
    //   result_type : ("int"|"string"|...)
    // }
    this.ident_table = [];

    // ========================================================
    // Создать копию хэша доступных идентификаторов
    this.copy_ident_hash_table = function(hash_table) {
        var res = new Object(null);

        for (var key in hash_table) {
            res[key] = hash_table[key];
        }

        return res;
    };


    // ========================================================
    // Создим новую таблицу идентификаторов
    this.build_ident_table = function() {
        // Изначально каждый идентификатор обозначает ф-ию
        var root_ident_hash = {};
        var t_this = this;
        this.ident_table = [];

        for (var func_name in this.functions_description) {
            this.ident_table.push({
                "number" : this.ident_table.length,
                "ident" : func_name,
                "type" : "Function",
                "result_type" : this.functions_description[func_name].type
            });

            root_ident_hash[func_name] = this.ident_table[this.ident_table.length - 1];
        }

        // Ок, теперь будем спускаться по синтаксическому дереву рекурсивно
        // и для каждого идентификатора определим где он был определен,
        // для каждого оставим ссылку на таблицу лексем

        // Но для начала -- несколько вспомагательных ф-ий
        // 1) Получает блок операторов в качестве параметра
        //    и возвращает первый оператор в блоке
        //    либо null если блок пустой
        function first_operator(operators_node) {
            if (operators_node.rule[1] == 0) {
                return null;
            }

            while (operators_node.childs[0].rule[1] == 1) {
                operators_node = operators_node.childs[0];
            }

            return operators_node.childs[1];
        }

        // 2) Получает оператор, и возвращает следующий
        //    либо возвращает null
        function next_operator(operator_node) {
            var operators = operator_node.parent;

            var operator_parent = operators.parent;
            if (operator_parent.name == "OPERATORS") {
                return operator_parent.childs[1];
            } else {
                return null;
            }
        }

        // 3) Получает декларацию переменных и добавляет их
        //    все в хэш и таблицу
        function add_decl_var(hash, decl_node, operators_block) {
            console.log(hash);

            var type = t_this.get_type(decl_node.childs[2]);
            var list = [];
            (function ident_list_build(node) {
                if (node.rule[1] == 0) {
                    list.push(node.childs[0].lex.value[1]);
                } else {
                    ident_list_build(node.childs[0]);
                    list.push(node.childs[2].lex.value[1]);
                }
            })(decl_node.childs[1]);

            // Ок, сформировали список
            // Для всех переменных проверим что
            // они не добавляличь еще в этом блоке и добавим
            list.forEach(function(val) {
                if (t_this.error) return;

                //console.log(hash[val]);
                if (hash[val] && hash[val]["block"] && hash[val].block == operators_block) {
                    // Скажем что ошибка, переменная объявлена в блоке дважды
                    t_this.error = true;
                    t_this.error_info = {
                        "line": decl_node.childs[0].lex.string,
                        "text": "Дважды объявлен идентификатор в одном блоке с одним именем " + val
                    };

                    return;
                }

                // Объекты вида
                // {
                //   number : номер строки в таблице,
                //   ident : ident,
                //   type : ("Function"|"Var"|"Array"),
                //   result_type : ("int"|"string"|...)
                //   ...
                //   block : block
                // }
                t_this.ident_table.push({
                    "block" : operators_block,
                    "number" : t_this.ident_table.length,
                    "ident" : val,
                    "type" : "Var",
                    "result_type" : type
                });

                hash[val] = t_this.ident_table[t_this.ident_table.length - 1];
            });
        }

        // 4) Пройти по всем выражениям и в каждом узле-идентификаторе добавить
        //    ссылку на вторую таблицу лексем
        function asociate_ident(hash, node) {
            if (node.name == "ident") {
                if (!hash[node.lex.value[1]]) {
                    t_this.error = true;
                    t_this.error_info = {
                        "line": node.lex.string,
                        "text": "Использован необъявленный идентификатор " + node.lex.value[1]
                    };
                } else {
                    // Все отлично
                    node.ident_link = hash[node.lex.value[1]];
                    node.lex.ident_link = hash[node.lex.value[1]].number;
                }
            } else {
                node.childs.forEach(function(val) {
                    asociate_ident(hash, val);
                })
            }
        }


        (function build_table(node, ident_hash, root_block) {
            // Если ошибка -- сразу завершаем работу
            if (t_this.error) return;


            // Ок, будем считать для начала что видимость
            // ограничивают только ф-ии, блоки операторов и циклы
            var hash_copy = {};

            if (node.name == "START") {
                // Для начала, если мы находимся в узле START -- будем
                // перебирать все ф-ии, локальные параметры вносим
                // как новые идентификаторы в таблицу лексем

                // 1 -- найдем блок ф-ий, и запустимся от него
                var prog = node.childs[0];
                prog.childs.forEach(function(val) {
                    build_table(val, ident_hash, root_block);
                });
            }
            else if (node.name == "FUNCTIONS") {
                node.childs.forEach(function(val) {
                    build_table(val, ident_hash, root_block);
                });
            }
            else if (node.name == "FUNCTION") {
                hash_copy = t_this.copy_ident_hash_table(ident_hash);
                var function_name = node.childs[1].lex.value[1];
                node.childs[1].ident_link = hash_copy[node.childs[1].lex.value[1]];

                var param_root = node;
                var block_root = node.childs[6];

                // Добавим все параметры в хэш с параметрами
                t_this.functions_description[function_name].params.forEach(function(val){
                    t_this.ident_table.push({
                        "block" : param_root,
                        "number" : t_this.ident_table.length,
                        "ident" : val.param_name,
                        "type" : "Var",
                        "result_type" : val.param_type
                    });

                    hash_copy[val] = t_this.ident_table[t_this.ident_table.length - 1];
                });

                // И запустимся для операторов из блока операторов
                build_table(block_root.childs[1], hash_copy, block_root);
            }
            else if (node.name == "MAIN_FUNCTION") {
                hash_copy = t_this.copy_ident_hash_table(ident_hash);
                build_table(node.childs[4].childs[1], hash_copy, node.childs[4]);
            }
            else {
                // В противном случае мы в каком то блоке операторов,
                // просто переберем все операторы в нем поочереди, и
                // в зависимости от типа будем с ними что то делать
                var operator = first_operator(node);
                console.log(" = > ", operator);

                while (operator) {
                    // Что то делаем
                    if (operator.rule[1] == 4) {
                        // OPERATORS_BLOCK
                        hash_copy = t_this.copy_ident_hash_table(ident_hash);
                        build_table(operator.childs[0].childs[0], hash_copy);
                    }
                    else if (operator.rule[1] == 2) {
                        // CYCLES
                        hash_copy = t_this.copy_ident_hash_table(ident_hash);

                        // Проверим что за цикл, если FOR, тогда проверим что в FOR_INIT
                        // может быть создана новая переменная
                        var cycle = operator.childs[0].childs[0];
                        if (cycle.name == "FOR") {
                            if (cycle.childs[1].rule[1] == 3) {
                                // Инициализация for -- декларация переменной
                                add_decl_var(hash_copy, cycle.childs[1].childs[0], cycle);
                            }

                            asociate_ident(hash_copy, cycle.childs[1]); // FOR_INIT
                            asociate_ident(hash_copy, cycle.childs[3]); // EXPR
                            asociate_ident(hash_copy, cycle.childs[5]); // FOR_ITER

                            build_table(cycle.childs[6].childs[1], hash_copy, cycle);
                        } else if (cycle.name == "WHILE") {
                            asociate_ident(hash_copy, cycle.childs[1]); // EXPR
                            build_table(cycle.childs[2].childs[1], hash_copy, cycle);
                        } else if (cycle.name == "FOR_IN") {
                            asociate_ident(hash_copy, cycle.childs[1]); // ident
                            asociate_ident(hash_copy, cycle.childs[3]); // ident
                            build_table(cycle.childs[4].childs[1], hash_copy, cycle);
                        }
                    }
                    else if (operator.rule[1] == 3) {
                        // IF
                        var if_block = operator.childs[0];
                        if (if_block.rule[1] == 0) {
                            // if без else
                            asociate_ident(ident_hash, if_block.childs[1]); // EXPR

                            hash_copy = t_this.copy_ident_hash_table(ident_hash);
                            // Для блока операторов делаем то же
                            build_table(if_block.childs[2].childs[1], hash_copy, if_block.childs[2]);
                        } else {
                            // if с else
                            asociate_ident(ident_hash, if_block.childs[1]); // EXPR
                            asociate_ident(ident_hash, if_block.childs[3]); // EXPR

                            hash_copy = t_this.copy_ident_hash_table(ident_hash);
                            // Для блока операторов делаем то же
                            build_table(if_block.childs[2].childs[1], hash_copy, if_block.childs[2]);

                            hash_copy = t_this.copy_ident_hash_table(ident_hash);
                            // Для блока операторов делаем то же
                            build_table(if_block.childs[4].childs[1], hash_copy, if_block.childs[4]);
                        }

                    }
                    else if (operator.rule[1] == 5) {
                        // VAR_DECL
                        add_decl_var(ident_hash, operator.childs[0], root_block);
                        asociate_ident(ident_hash, operator.childs[0]);
                    }
                    else {
                        asociate_ident(ident_hash, operator);
                    }

                    if (t_this.error) return;

                    // И переходим к следующему
                    operator = next_operator(operator);
                }

            }


            // Лишь бы эта херота заработала!
        })(this.tree, root_ident_hash, this.tree);


    };


    // ========================================================
    // Создать копию синтаксического дерева
    this.copy_tree = function(tree) {
        var res = {};
        res.name = tree.name;

        if (tree.lex) {
            res.lex = tree.lex;
        }

        if (tree.rule) {
            res.rule = tree.rule;
        }

        res.childs = [];

        for (var i = 0; i < tree.childs.length; ++i) {
            res.childs.push(this.copy_tree(tree.childs[i]));
        }

        return res;
    };


    // ========================================================
    // Найдем все ф-ии в программе и опишем их
    this.make_functions_list = function() {
        this.functions_description = {};
        var t_this = this;

        (function get_all_functions(node) {
            // Если где то произошла ошибка -- прерываемся
            if (t_this.error) {
                return;
            }

            if (node.name == "START") {
                get_all_functions(node.childs[0]);
                return;
            }

            if (node.name == "PROG") {
                if (node.rule[1] == 1) {
                    get_all_functions(node.childs[1]);
                    return;
                } else if (node.rule[1] == 2) {
                    get_all_functions(node.childs[0]);
                    return;
                }
                else if (node.rule[1] == 3) {
                    get_all_functions(node.childs[0]);
                    get_all_functions(node.childs[2]);
                    return;
                }
            }

            if (node.name == "FUNCTIONS") {
                if (node.rule[1] == 0) {
                    // Одна ф-ия
                    var description = t_this.get_function_description(node.childs[0]);
                    var name = description.name;

                    if (t_this.functions_description[name]) {
                        // Ошибка, ф-ия с одним и тем же именем объявлена дважды
                        t_this.error = true;
                        t_this.error_info = {
                            "line": node.childs[0].childs[0].lex.string,
                            "function": description,
                            "text": "Дважды объявлена ф-ия с именем " + name
                        }
                    }

                    t_this.functions_description[name] = description;
                } else if (node.rule[1] == 1) {
                    // Много ф-ий
                    get_all_functions(node.childs[0]);

                    var description = t_this.get_function_description(node.childs[1]);
                    var name = description.name;

                    if (t_this.functions_description[name]) {
                        // Ошибка, ф-ия с одним и тем же именем объявлена дважды
                        t_this.error = true;
                        //console.log(node);
                        t_this.error_info = {
                            "line": node.childs[1].childs[0].lex.string,
                            "function": description,
                            "text": "Дважды объявлена ф-ия с именем " + name
                        }
                    }

                    t_this.functions_description[name] = description;
                }
            }
        })(this.tree);

        // Все, список ф-ий готов
    };


    // ========================================================
    // По узлу с типом получим тип
    this.get_type = function(type_node) {
        if (type_node.name == "TYPE") {
            switch (type_node.rule[1]) {
                case 0:
                    return "int";

                case 1:
                    return "float";

                case 2:
                    return "string";

                case 3:
                    return "bool";
            }
        }

        if (type_node.name == "TYPE_WITH_VOID") {
            if (type_node.rule[1] == 0) {
                return "void";
            } else {
                return this.get_type(type_node.childs[0]);
            }
        }
    };


    // ========================================================
    // По узлу с функцией получим ее описание
    this.get_function_description = function(function_node) {
        var res = {};
        res.name = function_node.childs[1].lex.value[1];

        var t_this = this;
        res.params = (function get_params(params_node) {
            // Первое правило -- пустое
            if (params_node.name == "INPUT_PARAMS" && params_node.rule[1] == 0) {
                return [];
            }

            // Второе правило -- непустое
            if (params_node.name == "INPUT_PARAMS" && params_node.rule[1] == 1) {
                return get_params(params_node.childs[0]);
            }

            // Один параметр
            if (params_node.name == "NOTVOID_INPUT_PARAMS" && params_node.rule[1] == 0) {
                return [get_params(params_node.childs[0])];
            }

            // Несколько параметров
            if (params_node.name == "NOTVOID_INPUT_PARAMS" && params_node.rule[1] == 1) {
                var res = get_params(params_node.childs[0]);
                res.push(get_params(params_node.childs[2]));
                return res;
            }

            // Праметр
            if (params_node.name == "INPUT_PARAM") {
                return {
                    "param_type" : t_this.get_type(params_node.childs[1]),
                    "param_name" : params_node.childs[0].lex.value[1]
                };
            }
        })(function_node.childs[3]);

        res.type = this.get_type(function_node.childs[5]);

        // Теперь проверим, не повторяются ли в ф-ии параметры дважды с одним названием
        var names_hash = {};
        res.params.forEach(function(val) {
            if (t_this.error) return;

            if (!names_hash[val.param_name]) {
                names_hash[val.param_name] = true;
            } else {
                t_this.error = true;
                t_this.error_info = {
                    "line": function_node.childs[0].lex.string,
                    "function": res,
                    "text": "В ф-ии дважды объявлен параметр с одним именем (" + val.param_name + ")"
                }
            }
        });

        return res;
    };


    // ========================================================
    // Добавим во все узлы дерева ссылку на предка
    // Предок корня -- он сам
    this.add_parrent_link = function(node, parent) {
        if (!node) {
            this.add_parrent_link(this.tree, this.tree);
        } else {
            node.parent = parent;

            for (var i = 0; i < node.childs.length; ++i) {
                this.add_parrent_link(node.childs[i], node);
            }
        }
    };


    // ========================================================
    // Ф-ия семантического анализа
    this.semantic_analysis = function(tree) {
        this.error = false;
        this.error_info = {};
        this.functions_description = {};

        // Для себя создадим копию дерева и добавим
        // в каждый узел ссылку на предка
        this.tree = this.copy_tree(tree);
        this.add_parrent_link();

        // Теперь найдем описание всех ф-ий
        this.make_functions_list();

        console.log(this.functions_description);

        // Если ошибка, вернем соответствующий результат
        if (this.error) {
            return {
                "status": "Error",
                "info": this.error_info
            };
        }



        // Создадим вторую таблицу идентификаторов
        // Отличие от первой таблицы в том, что идентификаторы могут повторяться
        // Для каждого идентификатора определим, что он означает (ф-ию, переменную или массив)
        this.build_ident_table();

        // Если ошибка, вернем соответствующий результат
        if (this.error) {
            return {
                "status": "Error",
                "info": this.error_info
            };
        }


        // TODO
        // Сделать проверку типов выражений!


        // TODO
        // Найти все изменяющиеся переменные!


        console.log(this.ident_table);
        console.log(this.functions_description);
        console.log(this.ident_table);

        return {
            "status" : "Ok",
            "tree" : this.tree,
            "functions" : this.functions_description,
            "ident_table" : this.ident_table
        };
    };
}