var grammar_rules = {
    "start"     : "S",
    "terms"     : ["ident", "plus", "mul", "open", "close"],
    "noterms"   : ["S", "B", "E", "end_E", "end_S"],
    "rules"     : {
        "E" : [
            ["ident", "end_E"],
            ["B", "end_E"]
        ],

        "B": [
            ["open", "S", "close"]
        ],

        "S": [
            ["E", "end_S"]
        ],

        "end_E": [
            [],
            ["mul", "E"]
        ],

        "end_S": [
            [],
            ["plus", "S"]
        ]
    }
};


function show_error(txt) {
    console.log(txt);
}


function grammar_rules_analiz() {
    // Для начала для каждого нетерминала составим множество терминалов,
    // с которых он может начинаться
    var first = {};
    var noterms = grammar_rules.noterms;
    var rules = grammar_rules.rules;

    var terms_hash = {};
    grammar_rules.terms.forEach(function (term) {
        terms_hash[term] = true;
    });

    noterms.forEach(function(noterm) {
        first[noterm] = {}
    });

    var err = false;
    for (cur_noterm in rules) {
        var cur_rules = rules[cur_noterm];
        cur_rules.forEach(function(rule, idx) {
            if (err)
                return;

            // Если текущее правило пустое -- пропустим его
            if (rule.length == 0)
                return;

            // Добавим в first[cur_noterm] термы, с которых может начинаться
            // текущее правило
            if (terms_hash[rule[0]]) {
                // Пороверим, нет ли во множестве first текущего терминала
                if (!(first[cur_noterm][rule[0]] === undefined)) {
                    show_error("С терминала " + rule[0] + " начинается не одно правило для " + cur_noterm);
                    err = true;
                } else {
                    first[cur_noterm][rule[0]] = idx;
                }
            } else {
                var used = {};
                noterms.forEach(function(noterm) {
                    used[noterm] = false
                });
                used[cur_noterm] = true;

                (function dfs(first_noterm) {
                    used[first_noterm] = true;

                    rules[first_noterm].forEach(function(rule) {
                        if (err)
                            return;

                        if (rule.length == 0)
                            return;

                        if (terms_hash[rule[0]]) {
                            // Пороверим, нет ли во множестве first текущего терминала
                            if (!(first[cur_noterm][rule[0]] === undefined)) {
                                show_error("С терминала " + rule[0] + " начинается не одно правило для " + cur_noterm);
                                err = true;
                            } else {
                                first[cur_noterm][rule[0]] = idx;
                            }
                        } else if (used[rule[0]]) {
                            // Мы столкнулись с ошибкой, текущее правило неоднозначно
                            show_error("Невозможно однозначно разобрать правило для нетерминала " + cur_noterm);
                            err = true;
                        } else {
                            dfs(rule[0]);
                        }
                    });
                })(rule[0]);
            }
        });
    }

    // Где то здесь у нас уже сформированн first
    console.log(first);

    // Правильно ли построенны правила
    return err ? false : first;
}


function syntax_tree(lexems) {
// Строим синтаксическое дерево
// Если все ок, вернем объект вида
// {
//   "name" : корневой нетерминал,
//   "rule" : правило сверки,
//   "childs" : [... Массив с потомками ...]
// }
    var tree = {
        "name"   : grammar_rules.start,
        "rule"   : 0,
        "parent" : null,
        "childs" : []
    }

    var stack = [tree];

    var cur_lex_id = 0;
    var lex_cnt = lexems.length;

    var res = grammar_rules_analiz();
    if (!res) return;

    var terms_hash = {};
    grammar_rules.terms.forEach(function (term) {
        terms_hash[term] = true;
    });

    while (cur_lex_id < lex_cnt) {
        if (stack.length == 0) {
            show_error("Лишние токены");
            return false;
        }

        var stack_top = stack.pop();
        var top_name = stack_top.name;
        var top_parent = stack_top.parent;

        var cur_lexem = lexems[cur_lex_id]
        var cur_lex_name;
        if (typeof cur_lexem == "object") {
            cur_lex_name = cur_lexem[0];
        } else {
            cur_lex_name = cur_lexem;
        }

        if (terms_hash[top_name]) {
            if (top_name == cur_lex_name) {
                // Все ок, тут как то добавим текущую лексему в дерево
                stack_top.value = cur_lexem;
                ++cur_lex_id;
            } else {
                // Ошибка, ожидался другой токен
                show_error("Ожидался токен " + top_name);
                return false;
            }
        } else {
            if (res[top_name][cur_lex_name] === undefined) {
                // Проверим, можем ли мы свернуть текущий нетерминал пустым правилом
                var rules = grammar_rules.rules[top_name];
                var void_rule = false;
                rules.forEach(function(rule) {
                    if (rule.length == 0) {
                        void_rule = true;
                        stack_top.rule = rule_id;
                    }
                });

                if (!void_rule) {
                    // Не ожиданный токен
                    show_error("Неожиданный токен " + cur_lex_name);
                    return false;
                }
            } else {
                var rule_id = res[top_name][cur_lexem];
                stack_top.rule = rule_id;

                var rule = grammar_rules.rules[top_name][rule_id];

                for (var i = (rule.length - 1); i >= 0; --i) {
                    var tmp = {
                        "name" : rule[i],
                        "rule" : 0,
                        "parent" : stack_top,
                        "childs" : []
                    }

                    // Внимание! Потомки добавляются в обратном порядке!
                    // Позже их необходимо развернуть
                    stack_top.childs.push(tmp);
                    stack.push(tmp);
                }
            }
        }

        console.log(stack);
    }

    // Если в стеке осталась какая херня -- проверим что вся она
    // может быть заменена на пустоту
    while (stack.length != 0) {
        var stack_top  = stack.pop();
        var top_name   = stack_top.name;
        var top_parent = stack_top.parent;

        if (terms_hash[top_name]) {
            show_error("Токены кончились, однако ожидался токен " + top_name);
            return false;
        } else {
            var rules = grammar_rules.rules[top_name];
            var void_rule = false;
            rules.forEach(function(rule) {
                if (rule.length == 0) {
                    void_rule = true;
                    stack_top.rule = rule_id;
                }
            });

            if (!void_rule) {
                // Не ожиданный токен
                show_error("Токены кончились!");
                return false;
            }
        }

        console.log(stack);
    }

    var s_res = "";

    // Теперь если все ок, развернем списки сыновей в поддеревьях
    (function reverser(cur_noterm) {

        if (cur_noterm.childs.length != 0) {
            s_res += " [";
        }
        cur_noterm.childs.reverse();

        cur_noterm.childs.forEach(function(cur) {
            reverser(cur);
            s_res += ", ";
        });

        if (cur_noterm.childs.length != 0) {
            s_res += "] ";
        }
    })(tree);

    console.log(s_res);
    return tree;
}
