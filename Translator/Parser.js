// Создадим объект-синтаксический анализатор
function Parser() {
    var noterm_separator = ".";
    var rule_separator = "|";
    this.fsm = {};

    this.rule_to_str = function(rule) {
        var res = "";
        if (rule.length) {
            res = rule[0];
        }

        for (var i = 1; i < rule.length; ++i)
            res += noterm_separator + rule[i];

        return res;
    };

    this.rules_to_str = function(rules) {
        var str_arr = [];
        var t_this = this;
        rules.forEach(function(t) { str_arr.push(t_this.rule_to_str(t)) });
        str_arr.sort();
        var res = "";
        str_arr.forEach(function(t) { res += rule_separator + t });

        return res;
    };

    this.is_term = function(grammar_rules, str) {
        for (var i = 0; i < grammar_rules.terms.length; ++i) {
            if (grammar_rules.terms[i] == str)
                return true;
        }

        return false;
    };

    this.extand_state = function(rules, grammar_rules) {
        // Набор правил со звездочкой, которая отмечает наше текущее положение.
        // Расширяет его до полного набора

        var maked_rule = {};
        for (var i = 0; i < rules.length; ++i) {
            maked_rule[this.rule_to_str(rules[i])] = true;
        }

        // Теперь для каждого правила просмотрим что мы можем добавить
        for (var i = 0; i < rules.length; ++i) {
            // Найдем в текущем правиле звездочку
            var j;
            for (j = 0; rules[i][j] != '*'; ++j);

            // Звездочка в позиции j
            if (rules[i].length - 1 != j) {
                // Следующая хрень -- то, что нам нужно добавить
                ++j;
                if (!this.is_term(grammar_rules, rules[i][j])) {
                    // добавим в add_rules новые правила

                    var analiz_rules = grammar_rules.rules;

                    for (var k = 0; k < analiz_rules.length; ++k) {
                        if (analiz_rules[k][0] == rules[i][j]) {
                            var tmp = analiz_rules[k].slice();
                            tmp.splice(1, 0, '*');
                            var rules_str = this.rule_to_str(tmp);
                            if (!maked_rule[rules_str]) {
                                rules.push(tmp);
                                maked_rule[rules_str] = true;
                            }
                        }
                    }
                }
            }
        }

        //console.log(maked_rule);
        return rules;
    };

    this.make_state_by_shift = function(rules, token, grammar_rules) {
        var new_rules = [];

        for (var i = 0; i < rules.length; ++i) {
            // Найдем в текущем правиле звездочку
            var j;
            for (j = 0; rules[i][j] != '*'; ++j);

            // Звездочка в позиции j
            if (rules[i].length - 1 != j) {
                // Если после звездочки то что нам нужно --
                // то это правило меняем и добавляем к новым
                ++j;
                if (rules[i][j] == token) {
                    var copy = rules[i].slice();
                    copy.splice(j - 1, 1);
                    --j;
                    copy.splice(j + 1, 0, "*");
                    new_rules.push(copy);
                }
            }
        }

        this.extand_state(new_rules, grammar_rules);
        return new_rules;
    };

    this.can_reduce = function(rules) {
        // Если в текущей позиции возможна свертка -- вернем
        // правило по которому мы можем свернуть
        // Иначе вернем false
        // Ну и если свертка неоднозначна -- выведем сообщение об ошибке
        var res = false;
        var ambiguous = false;

        rules.forEach(function(rule) {
            if (rule[rule.length - 1] == "*") {
                if (res) {
                    ambiguous = true;
                    console.log("Неоднозначная свертка!");
                    console.log(rules);
                }

                res = rule.slice();
                res.splice(-1, 1);
            }
        });

        if (ambiguous) {
            return {
                "status": "Error"
            };
        }

        return {
            "status" : "Ok",
            "result" : res
        };
    };

    this.make_fsm = function() {
        // Создать конечный автомат.
        // Объект, у него есть ф-ия get(x, y);
        // x -- состояние автомата, y -- очередная лексема
        // Возвращает что нам сделать (shift и следующее состояние автомата или reduce, и правило)
        // Может так же вернуть ошибку, если невозможно произвести свертку и сдвинуть символ

        // Проанализируем все возможные состояние конечного автомата
        var possible_tokens = this.grammar_rules.terms.slice().concat(this.grammar_rules.noterms, "end");

        var start_rules = this.extand_state([["*", this.grammar_rules.start]], this.grammar_rules);

        var states = [{
            "id" : 0,
            "rules" : start_rules,
            "hash_str" : this.rules_to_str(start_rules),
            "goto" : {}, // Куда надо перейти из этого состояния если встретили очередной токен
            "red" : false // Во что можно свернуть текущее состояние
        }];

        var hashes = {};
        hashes[states[0].hash_str] = 0;

        // Получим все возможные состояния для данной грамматики
        for (var cur_state = 0; cur_state < states.length; ++cur_state) {
            var t_this = this;
            var error = false;

            possible_tokens.forEach(function(token) {
                var new_state_rule = t_this.make_state_by_shift(states[cur_state].rules, token, t_this.grammar_rules);
                if (new_state_rule.length == 0)
                    return;

                var red = t_this.can_reduce(new_state_rule);
                if (red.status == "Error") {
                    error = true;
                    return;
                }

                var new_state = {
                    "id" : states.length,
                    "rules" : new_state_rule,
                    "hash_str" : t_this.rules_to_str(new_state_rule),
                    "goto" : {},       // Куда надо перейти из этого состояния если встретили очередной токен
                    "red" : red.result // Во что можно свернуть текущее состояние
                };

                if (typeof hashes[new_state.hash_str] == "undefined") {
                    states.push(new_state);
                    hashes[new_state.hash_str] = states.length - 1;
                }

                states[cur_state].goto[token] = hashes[new_state.hash_str];

            });

            if (error) {
                return {
                    "status"     : "Error",
                    "Error_text" : "Неоднозначная свертка"
                }
            }
        }

        // Выводим в консоль получившийся автомат для отладки
        console.log(states);


        this.fsm.states = states;
        this.fsm.get = function (state, token) {
            var cur_state = this.states[state];
            if (cur_state.goto[token]) {
                return {
                    "command" : "shift",
                    "next_state" : cur_state.goto[token]
                }
            }
            else if (cur_state.red) {
                return {
                    "command" : "reduce",
                    "rule" : cur_state.red
                }
            }
            else {
                return {
                    "command" : "error"
                }
            }
        };

        return {
            "status" : "Ok"
        }
    };

    // =====================================================================
    // Инициализация
    // Создание по правилам грамматики конечного автомата
    this.init = function(grammar_rules) {
        // Зададим правила грамматики
        this.grammar_rules = grammar_rules;

        // Создадим конечный автомат
        return this.make_fsm();
    };


    // =====================================================================
    // Функция парсинга
    this.make_tree = function(lexems) {
        // В стеке объекты вида {name : lol, childs: [], state : st, [lex : ololo]}
        var fsm = this.fsm;
        var stack = [];

        var state = 0;
        var cur_lexem = 0;

        var noterm_stack = [];

        while ((stack.length != 1 || stack[0].name != this.grammar_rules.start)) {
            // Ок, получаем очередную команду
            if (noterm_stack.length != 0) {
                // Это выполняется в том случае, если в очереди есть нетерминалы
                var last_name = noterm_stack[noterm_stack.length - 1].name;

                state = 0;
                if (stack.length > 0) {
                    state = stack[stack.length - 1].state;
                }

                var command = fsm.get(state, last_name);

                if (command.command == "shift") {
                    // console.log("shift => ", command.next_state);
                    var to_stack = {
                        name : last_name,
                        childs: noterm_stack[noterm_stack.length - 1].childs,
                        state : command.next_state
                    };

                    stack.push(to_stack);
                    noterm_stack.pop();
                }
                else {
                    // Свертка!
                    // console.log("reduce => ", command.rule);
                    var cnt = command.rule.length - 1;
                    var childs = stack.splice(-cnt, cnt);
                    var noterm_name = command.rule[0];

                    var obj = {
                        name : noterm_name,
                        childs: childs
                    }

                    noterm_stack.push(obj);
                }

                continue;
            }

            // lexem -- очередная лексема
            var lexem;
            if (cur_lexem >= lexems.length) {
                lexem = {
                    "type" : "end"
                };
            } else {
                lexem = lexems[cur_lexem];
            }

            var lex_name = lexem.type;

            state = 0;
            if (stack.length > 0) {
                state = stack[stack.length - 1].state;
            }

            var command = fsm.get(state, lex_name);
            if (command.command == "error") {
                // Вернем ошибку
                return {
                    "status" : "Error",
                    "info" : {
                        "cur_lexem" : cur_lexem,
                        "stack" : stack,
                        "noterm_stack" : noterm_stack
                    }
                }
            }
            else if (command.command == "shift") {
                // Сдвиг
                var to_stack = {
                    name : lex_name,
                    childs: [],
                    state : command.next_state,
                    lex : lexem
                }

                stack.push(to_stack);
                ++cur_lexem;
            }
            else {
                // Свертка!
                var cnt = command.rule.length - 1;
                var childs = stack.splice(-cnt, cnt);
                var noterm_name = command.rule[0];

                var obj = {
                    name : noterm_name,
                    childs: childs
                }

                noterm_stack.push(obj);
            }
        }

        return {
            "status" : "Ok",
            "tree" : stack[0]
        };
    }
}