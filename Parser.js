// Парсер JSON
function JSON_parse(txt) {
    // return JSON.parse(txt);

    // Разобъем исходный файл на лексемы
    var lexem = JSON_lexer(txt);
    //console.log(lexem);

    // По лексемам построим синтаксическое дерево
    var syntax_tree = JSON_syntax_analizer(lexem);
    //console.log(syntax_tree);

    // По синтаксическому дереву построим объект
    var obj = JSON_build_obj(syntax_tree);
    //console.log(obj);

    return obj;
}

// Список лексем JSON
var JSON_token_list = {
    "string" : {
        "reg" : /^"(?:[^"\\]|\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4}))*"/,
        "skip" : false
    },

    "space" : {
        "reg" : /^\s+/,
        "skip" : true
    },

    "number" : {
        "reg" : /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/,
        "skip" : false
    },

    "bool" : {
        "reg" : /^(true|false)/,
        "skip" : false
    },

    "null" : {
        "reg" : /^null/,
        "skip" : false
    },

    "delimiters" : {
        "reg" : /^[\:\,\[\]\{\}]/,
        "skip" : false
    }
}

// Убирает в строке экранированные символы
function parse_string(str) {
    var res = "";
    var i;
    var j;

    for (i = 1; i < (str.length - 1); ++i) {
        if (str[i] == "\\") {
            ++i;
            if (str[i] == "u") {
                var num = "";
                for (j = 0; j < 4; ++j) {
                    num += str[i];
                    ++i;
                }
                res += String.fromCharCode(parseInt(num, 16));
            } else {
                switch (str[i]) {
                    case "t" :
                        res += "\t";
                        break;

                    case "\\" :
                        res += "\\";
                        break;

                    case "/" :
                        res += "\/";
                        break;

                    case "b" :
                        res += "\b";
                        break;

                    case "n" :
                        res += "\n";
                        break;

                    case "r" :
                        res += "\r";
                        break;

                    case "f" :
                        res += "\f";
                        break;

                    case "t" :
                        res += "\t";
                        break;

                    default :
                        res += str[i];
                }
            }
        } else {
            res += str[i];
        }
    }

    return res;
}


// Ф-ия лексер
function JSON_lexer(txt) {
    // Вернем массив вида [{"type" : "token_type", "value" : "token_value"}, ...]
    var res = [];

    while (txt.length != 0) {
        // Проверяем все лексемы, пока не найдем нужную
        // или пока список не закончится
        var f = false;

        for (var token_type in JSON_token_list) {
            var reg = JSON_token_list[token_type].reg;
            var ex_res = reg.exec(txt);
            if (ex_res) {
                // Мы нашли нужный токен
                f = true;

                // Удалим его
                txt = txt.replace(reg, "");

                // Если токен надо заносить в список токенов -- занесем
                if (!JSON_token_list[token_type].skip) {
                    var value = ex_res[0];
                    if (token_type == "string") {
                        value = parse_string(value);
                    } else if (token_type == "number") {
                        value = +value;
                    } else if (token_type == "bool") {
                        value = (value == "true");
                    } else if (token_type == "null") {
                        value = null;
                    }

                    res.push(
                    {
                        "type" : token_type,
                        "value" : value
                    }
                    )
                }

                // Завершаем обход токенов
                break;
            }
        }

        // Если цикл завершился и ни одного токена не найдено -- ошибка
        // TODO выкинуть сообщение об ошибке
        if (!f) {
            // console.log("LOL");
            return res;
        }
    }

    return res;
}


function is_value(type) {
    return (
        type == "string" ||
        type == "number" ||
        type == "bool" ||
        type == "object" ||
        type == "array" ||
        type == "null"
    )
}

function OBJ_reduce(stack) {
    var l = stack.length;

    // Проверим, можем ли свернуть пару
    if (l >= 3 &&
        is_value(stack[l - 1].type) &&
        stack[l - 2].type == "delimiters" &&
        stack[l - 2].value == ":" &&
        stack[l - 3].type == "string") {

        var a = stack.pop();
        stack.pop();
        var b = stack.pop();
        stack.push({
            "type" : "pair",
            "value" : [b, a]
        });

        // Смогли "свернуть" пару
        return true;
    }

    // Проверим, можем ли свернуть пары
    if (l >= 3 &&
        stack[l - 1].type == "pair" &&
        stack[l - 2].type == "delimiters" &&
        stack[l - 2].value == "," &&
        stack[l - 3].type == "pairs") {

        var a = stack.pop();
        stack.pop();
        stack[l - 3]["value"].push(a);

        // Смогли "свернуть" пары
        return true;
    }

    // Проверим, можем ли свернуть из двух одиночных пар пары
    if (l >= 3 &&
        stack[l - 1].type == "pair" &&
        stack[l - 2].type == "delimiters" &&
        stack[l - 2].value == "," &&
        stack[l - 3].type == "pair") {

        var a = stack.pop();
        stack.pop();
        var b = stack.pop();
        stack.push({
            "type" : "pairs",
            "value" : [b, a]
        })

        // Смогли "свернуть" пары
        return true;
    }

    // Проверим, можем ли свернуть значения
    if (l >= 3 &&
        is_value(stack[l - 1].type) &&
        stack[l - 2].type == "delimiters" &&
        stack[l - 2].value == "," &&
        stack[l - 3].type == "values"
    ) {
        var a = stack.pop();
        stack.pop();
        //debugger;
        stack[l - 3].value.push(a);

        return true;
    }


    if (l >= 3 &&
        is_value(stack[l - 1].type) &&
        stack[l - 2].type == "delimiters" &&
        stack[l - 2].value == "," &&
        is_value(stack[l - 3].type)
    ) {
        var a = stack.pop();
        stack.pop();
        var b = stack.pop();
        stack.push({
            "type" : "values",
            "value" : [b, a]
        });

        return true;
    }

    // Проверим, можем ли свернуть объект
    if (l >= 2 &&
        stack[l - 1].type == "delimiters" &&
        stack[l - 1].value == "}" &&
        stack[l - 2].type == "delimiters" &&
        stack[l - 2].value == "{"
    ) {
        stack.pop();
        stack.pop();
        stack.push({
            "type" : "object",
            "value" : []
        });

        return true;
    }

    if (l >= 3 &&
        stack[l - 1].type == "delimiters" &&
        stack[l - 1].value == "}" &&
        (stack[l - 2].type == "pair" || stack[l - 2].type == "pairs") &&
        stack[l - 3].type == "delimiters" &&
        stack[l - 3].value == "{"
    ) {
        stack.pop();
        var a = stack.pop();
        stack.pop();

        if (a.type == "pairs") {
            stack.push({
                "type" : "object",
                "value" : [a]
            });
        } else {
            stack.push({
                "type" : "object",
                "value" : [{
                    "type" : "pairs",
                    "value" : [a]
                }]
            });
        }

        return true;
    }


    // Проверим, можем ли свернуть массив
    if (l >= 2 &&
        stack[l - 1].type == "delimiters" &&
        stack[l - 1].value == "]" &&
        stack[l - 2].type == "delimiters" &&
        stack[l - 2].value == "["
    ) {
        stack.pop();
        stack.pop();
        stack.push({
            "type" : "array",
            "value" : []
        });

        return true;
    }

    if (l >= 3 &&
        stack[l - 1].type == "delimiters" &&
        stack[l - 1].value == "]" &&
        (is_value(stack[l - 2].type) || stack[l - 2].type == "values") &&
        stack[l - 3].type == "delimiters" &&
        stack[l - 3].value == "["
    ) {
        stack.pop();
        var a = stack.pop();
        stack.pop();

        if (a.type == "values") {
            stack.push({
                "type" : "array",
                "value" : [a]
            });
        } else {
            stack.push({
                "type" : "array",
                "value" : [{
                    "type" : "values",
                    "value" : [a]
                }]
            });
        }

        return true;
    }

    return false;
}


// Построение синтаксического дерева
function JSON_syntax_analizer(lexem) {
    // Синтаксическое дерево -- дерево элементов вида { "type" : "some_type", "value" : [..childs..] }
    var stack = [];

    for (var i = 0; i < lexem.length; ++i) {
        stack.push(lexem[i]);
        while (OBJ_reduce(stack));
    }

    //console.log(stack);
    return stack[0];
}


// Строим объект по синтаксическому дереву
function JSON_build_obj(syntax_tree) {
    if (is_value(syntax_tree["type"]) &&
      !(syntax_tree["type"] == "object") &&
      !(syntax_tree["type"] == "array"))
    {
        return syntax_tree["value"];
    }

    if (syntax_tree["type"] == "object") {
        if (syntax_tree["value"].length == 0) {
            return Object.create(null);
        } else {
            //console.log("Get obj");
            var res = Object.create(null)
            var pairs_arr = syntax_tree["value"][0]["value"];
            for (var i = 0; i < pairs_arr.length; ++i) {
                //console.log(pairs_arr[i]["value"]);
                res[pairs_arr[i]["value"][0]["value"]] = JSON_build_obj(pairs_arr[i]["value"][1])
            }

            //console.log(res);
            return res;
        }
    }

    if (syntax_tree["type"] == "array") {
        if (syntax_tree["value"].length == 0) {
            return []
        } else {
            //console.log("Get arr");
            var res = [];
            var values_arr = syntax_tree["value"][0]["value"];
            for (var i = 0; i < values_arr.length; ++i) {
                res.push(JSON_build_obj(values_arr[i]));
            }
            return res;
        }
    }

    return null;
}
