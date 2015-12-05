// Объект-консоль
function HTMLConsole(name, visible, child) {
    // Главный блок, внутри него все остальное
    this.dom_obj = document.createElement('div');

    if (!child) {
        this.dom_obj.className = "HTMLConsole";
    } else {
        this.dom_obj.className = "HTMLConsole_child";
    }

    if (typeof visible == "undefined") {
        visible = true;
    }

    // Добавим это все остальное
    // Прежде всего у нас три объекта [[заголовок], [Блок с сообщениями], [поле для воода команд]]

    // Заголовок
    this.header = document.createElement('h3');
    this.header.appendChild(document.createTextNode(name));
    this.dom_obj.appendChild(this.header);

    // Окно сообщений
    this.massage_box = document.createElement('div');
    if (!visible) {
        this.massage_box.className = "unvisible";
    }

    var box = this.massage_box;
    this.header.onclick = function() {
        box.classList.toggle("unvisible");
    }


    this.dom_obj.appendChild(this.massage_box);

    // Текстовое поле для ввода команд
    // TODO

    // ================================================================

    // Получить DOM объект для вставки в документ
    this.getHTML = function() {
        return this.dom_obj;
    }

    // Вывести сообщение в консоль
    // type -- тип, пока определено 2 -- "warning" и "no_warning"
    this.addMassage = function(massage, type) {
        type = type || "no_warning";
        var msg = document.createElement('div');
        msg.appendChild(document.createTextNode(massage));
        msg.className = "HTMLConsole_" + type;

        this.massage_box.appendChild(msg);
    }

    this.addBox = function(box_header, visible) {
        // Нормальный блок для сообщений
        // TODO
        var box = new HTMLConsole(box_header, visible, true);

        this.massage_box.appendChild(box.getHTML());
        return box;
    }
}