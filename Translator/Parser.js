// Создадим объект-синтаксический анализатор
function Parser() {
    var noterm_separator = ".";
    var rule_separator = "|";
    this.fsm = {};

    this.rule_to_str = function(rule) {
        return "" + rule;
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

    this.is_term = function(str) {
        if (str == "end") return true;

        for (var i = 0; i < this.grammar_rules.terms.length; ++i) {
            if (this.grammar_rules.terms[i] == str)
                return true;
        }

        return false;
    };

    this.extand_state = function(rules) {
        // Набор правил с нашей текущей позицией
        // Расширяет его до полного набора
        var maked_rule = {};
        var i;

        for (i = 0; i < rules.length; ++i) {
            maked_rule[this.rule_to_str(rules[i])] = true;
        }

        // Теперь для каждого правила просмотрим что мы можем добавить
        for (i = 0; i < rules.length; ++i) {
            var cur_rule = this.grammar_rules.rules[rules[i][0]][rules[i][1]];

            if (rules[i][2] < cur_rule.length && !this.is_term(cur_rule[rules[i][2]])) {
                var analiz_rules = this.grammar_rules.rules[cur_rule[rules[i][2]]];

                for (j = 0; j < analiz_rules.length; ++j) {
                    var tmp_rule_to_add = [cur_rule[rules[i][2]], j, 0];

                    if (!maked_rule[this.rule_to_str(tmp_rule_to_add)]) {
                        maked_rule[this.rule_to_str(tmp_rule_to_add)] = true;
                        rules.push(tmp_rule_to_add);
                    }
                }
            }
        }
        return rules;
    };

    this.make_state_by_shift = function(rules, token) {
        var new_rules = [];

        for (var i = 0; i < rules.length; ++i) {
            var cur_rule = this.grammar_rules.rules[rules[i][0]][rules[i][1]];

            if (rules[i][2] < cur_rule.length && cur_rule[rules[i][2]] == token) {
                new_rules.push(rules[i].slice()); // Копируем правило
                new_rules[new_rules.length - 1][2]++;// Передвигаем вперед текущую позицию
            }
        }

        this.extand_state(new_rules);
        return new_rules;
    };

    this.can_reduce = function(rules) {
        // Если в текущей позиции возможна свертка -- вернем
        // правило по которому мы можем свернуть
        // Иначе вернем false
        // Ну и если свертка неоднозначна -- выведем сообщение об ошибке
        var res = false;
        var ambiguous = false;

        for (var i = 0; i < rules.length; ++i) {
            var cur_rule = this.grammar_rules.rules[rules[i][0]][rules[i][1]];

            if (rules[i][2] == cur_rule.length) {
                if (res) {
                    ambiguous = true;
                    console.log("Неоднозначная свертка!");
                    console.log("Возможна свертка по правилу : ", rules[i][0], cur_rule);
                    console.log("Также свертка по правилу : ", res);
                    console.log(rules);
                }

                res = [rules[i][0], rules[i][1]];
            }
        }

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
        // Для начала составим список нетерминалов
        this.grammar_rules.notermlist = [];
        for (var key in this.grammar_rules.rules) {
            this.grammar_rules.notermlist.push(key);
        }

        var possible_tokens = this.grammar_rules.terms.slice().concat(this.grammar_rules.notermlist, "end");

        // Теперь состаяние -- это множество вида СВОРАЧИВАЕМЫЙ_НЕТЕРМИНАЛ, номер правила, позиция
        var start_rules = this.extand_state([ ["START", 0, 0] ]);
        console.log("=== >", start_rules);

        var red = this.can_reduce(start_rules);
        if (red.status == "Error") {
            return {
                "status"     : "Error",
                "Error_text" : "Неоднозначная свертка"
            }
        }

        var states = [{
            "id" : 0,
            "rules" : start_rules,
            "hash_str" : this.rules_to_str(start_rules),
            "goto" : {}, // Куда надо перейти из этого состояния если встретили очередной токен
            "red" : red.result // Во что можно свернуть текущее состояние
        }];

        var hashes = {};
        hashes[states[0].hash_str] = 0;

        // Получим все возможные состояния для данной грамматики
        for (var cur_state = 0; cur_state < states.length; ++cur_state) {
            var t_this = this;
            var error = false;

            possible_tokens.forEach(function(token) {
                if (error) return;

                var new_state_rule = t_this.make_state_by_shift(states[cur_state].rules, token);
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
                if (noterm_stack[0].name == this.grammar_rules.start) {
                    stack.push(noterm_stack[0]);
                    noterm_stack.pop();
                    continue;
                }

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
                        rule: noterm_stack[noterm_stack.length - 1].rule,
                        state : command.next_state
                    };

                    stack.push(to_stack);
                    noterm_stack.pop();
                }
                else {
                    // Свертка!
                    // console.log("reduce => ", command.rule);
                    console.log(command);
                    console.log(state, last_name);
                    var cnt = this.grammar_rules.rules[command.rule[0]][command.rule[1]].length;
                    var childs = stack.splice(-cnt, cnt);
                    var noterm_name = command.rule[0];

                    var obj = {
                        name : noterm_name,
                        childs: childs,
                        rule: command.rule
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
                var cnt = this.grammar_rules.rules[command.rule[0]][command.rule[1]].length;
                var childs = stack.splice(-cnt, cnt);
                var noterm_name = command.rule[0];

                var obj = {
                    name : noterm_name,
                    childs: childs,
                    rule: command.rule
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