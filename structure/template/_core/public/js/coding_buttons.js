
function script_append(f) {

    var str = "";
    var doc = currentMirror.getDoc();
    var cursor = doc.getCursor(); // gets the line number in the cursor position
    var line = doc.getLine(cursor.line); // get the line contents
    var pos = {
        line: cursor.line
    };

    switch (f) {
        case 'input' : // Saisir un champ
            str = "// Fill in a field\n";
            str += `$("input[name='myField']").val(myValue);\n\n`;
            break;
        case 'select' : // Choisir une valeur dans une liste déroulante
            str = "// Choose a value in drop-down list\n";
            str += `$("select[name='myField']").val(myValue).trigger('change');\n\n`;
            break;
        case 'checkbox' : // Cocher une case à cocher
            str = "// Click checkbox\n";
            str += `$("input:checkbox[name='myCheckBox']").attr('checked',true);\n\n`;
            break;
        case 'radio' : // Activer un bouton radio
            str = "// Activate radio button\n";
            str += `$("#myRadioButton").prop('checked', true);\n\n`;
            break;
        case 'submit' : // Soumettre un formulaire
            str = "// Submit a form\n";
            str += `$("form[name='myForm']").submit();\n\n`;
            break;
        case 'read_text' : // Lire un texte
            str = "// Read text\n";
            str += `$("div[name='myElement']").textContent\n\n`;
            break;
        case 'read_field' : // Lire un champ
            str = "// Lire un champ\n";
            str += `$("input[name='myField']").val()\n\n`;
            break;
        case 'click_element' : // Cliquer sur un élément
            str = "// Click on an element\n";
            str += `$("#myElement").click();\n\n`;
            break;
        case 'find_element' : // Trouver un élément
            str = "// Find an element\n";
            str += `$("#myRootElement").find(myElement);\n\n`;
            break;
        case 'keydown_enter' : // Appuyer sur la touche Entrée
            str = "// Press Entrer\n";
            str += `document.dispatchEvent(\n`;
            str += `    new KeyboardEvent("keydown", {\n`;
            str += `        key: "Enter",\n`;
            str += `        keyCode: 13,\n`;
            str += `        code: "Enter",\n`;
            str += `        which: 13,\n`;
            str += `        shiftKey: false,\n`;
            str += `        ctrlKey: false,\n`;
            str += `        metaKey: false\n`;
            str += `    })\n`;
            str += `);\n\n`;
            break;
        case 'keydown_tab' : // Appuyer sur la touche Tabulation
            str = "// Press Tabulation\n";
            str += `document.dispatchEvent(\n`;
            str += `    new KeyboardEvent("keydown", {\n`;
            str += `        key: "Tab",\n`;
            str += `        keyCode: 9,\n`;
            str += `        code: "Tab",\n`;
            str += `        which: 9,\n`;
            str += `        shiftKey: false,\n`;
            str += `        ctrlKey: false,\n`;
            str += `        metaKey: false\n`;
            str += `    })\n`;
            str += `);\n\n`;
            break;
        case 'keydown_backspace' : // Appuyer sur la touche Backspace
            str = "// Press Backspace\n";
            str += `document.dispatchEvent(\n`;
            str += `    new KeyboardEvent("keydown", {\n`;
            str += `        key: "Backspace",\n`;
            str += `        keyCode: 8,\n`;
            str += `        code: "Backspace",\n`;
            str += `        which: 8,\n`;
            str += `        shiftKey: false,\n`;
            str += `        ctrlKey: false,\n`;
            str += `        metaKey: false\n`;
            str += `    })\n`;
            str += `);\n\n`;
            break;
        case 'keydown_esc' : // Appuyer sur la touche Escape
            str = "// Press Escape\n";
            str += `document.dispatchEvent(\n`;
            str += `    new KeyboardEvent("keydown", {\n`;
            str += `        key: "Escape",\n`;
            str += `        keyCode: 27,\n`;
            str += `        code: "Escape",\n`;
            str += `        which: 27,\n`;
            str += `        shiftKey: false,\n`;
            str += `        ctrlKey: false,\n`;
            str += `        metaKey: false\n`;
            str += `    })\n`;
            str += `);\n\n`;
            break;
        case 'keydown_any' : // Appuyer sur une touche
            str = "// Press a key\n";
            str += `document.dispatchEvent(\n`;
            str += `    new KeyboardEvent("keydown", {\n`;
            str += `        key: "myKey",\n`;
            str += `        keyCode: 00,\n`;
            str += `        code: "myKey",\n`;
            str += `        which: 00,\n`;
            str += `        shiftKey: false,\n`;
            str += `        ctrlKey: false,\n`;
            str += `        metaKey: false\n`;
            str += `    })\n`;
            str += `);\n\n`;
            break;
        case 'open_tab' : // Ouvrir un nouvel onglet
            str = "// Open new tab\n";
            str += `document.dispatchEvent(\n`;
            str += `    new KeyboardEvent("keydown", {\n`;
            str += `        key: "KeyT",\n`;
            str += `        keyCode: 84,\n`;
            str += `        code: "KeyT",\n`;
            str += `        which: 84,\n`;
            str += `        shiftKey: false,\n`;
            str += `        ctrlKey: true,\n`;
            str += `        metaKey: false\n`;
            str += `    })\n`;
            str += `);\n\n`;
            break;
        case 'change_tab' : // Changer d'onglet
            str = "// Change tab\n";
            str += `document.dispatchEvent(\n`;
            str += `    new KeyboardEvent("keydown", {\n`;
            str += `        key: "Tab",\n`;
            str += `        keyCode: 9,\n`;
            str += `        code: "Tab",\n`;
            str += `        which: 9,\n`;
            str += `        shiftKey: false,\n`;
            str += `        ctrlKey: true,\n`;
            str += `        metaKey: false\n`;
            str += `    })\n`;
            str += `);\n\n`;
            break;
        case 'open_url' : // Naviguer vers une URL
            str = "// Open new URL\n";
            str += `this.location.href='myURL';\n\n`;
            break;
        case 'error' : // Interompre le programme en erreur
            str = "// Interupt program with error code\n";
            str += `throw new Error('myErrorCode');\n\n`;
            break;
        default :
            break;
    }

    // doc.replaceRange(str, pos);
    var selection = currentMirror.getSelection();

    if(selection.length>0) {
        currentMirror.replaceSelection(str);
    }
    else {
        if (!pos.line) {
            pos.line = doc.lastLine() -1;
        }
        doc.replaceRange(str, pos);
    }

    currentMirror.setValue(js_beautify(currentMirror.getValue()));
};

function add_script_variable(v) {

    var str = "";
    var doc = currentMirror.getDoc();
    var cursor = doc.getCursor(); // gets the line number in the cursor position
    var line = doc.getLine(cursor.line); // get the line contents
    var pos = {
        line: cursor.line
    };

    switch (v) {
        case 'step_index':
            str = "stepData.stepIdx";
            break;
        case 'step_serial_number':
            str = "stepData.serialNumber";
            break;
        case 'env':
            str = "env.myVariable";
            break;
        case 'session':
            str = "sessionData.myVariable";
            break;
        default:
            break;
    }

    var selection = currentMirror.getSelection();

    if(selection.length>0) {
        currentMirror.replaceSelection(str);
    }
    else {
        if (!pos.line) {
            pos.line = doc.lastLine();
        }
        doc.replaceRange('\n' + str, pos);
    }

    currentMirror.setValue(js_beautify(currentMirror.getValue()));
}

function sequence_append(f) {

    var str = "";
    var doc = currentMirror.getDoc();
    var cursor = doc.getCursor(); // gets the line number in the cursor position
    var line = doc.getLine(cursor.line); // get the line contents
    var pos = {
        line: cursor.line
    };

    switch (f) {
        case 'test' : // Effectuer un test conditionnel
            str = "// Test condition\n";
            str += `if (myCondition) {\n`;
            str += `    \n`;
            str += `}\n`;
            str += `else {\n`;
            str += `    \n`;
            str += `}\n\n`;
            break;
        case 'download' : // Télécharger un document
            str = "// Download a document\n";
            str += `utils.download('FILE_URL');\n\n`;
            break;
        case 'upload' : // Uploader un document
            str = "// Upload a document\n";
            str += `const downloads = await utils.waitDownloads();\n`;
            str += `for (const download of downloads)\n`;
            str += `\tif (download.state == 'success')\n`;
            str += `\t\tawait utils.upload('API_URL', download.filePath)\n\n`;
            break;
        case 'mapping' : // Transformer une valeur suivant une table de paramétrage
            str = "/* Transform a value according to settings tables\n";
            str += `Variables :\n`;
            str += ` - myEntity : entity name on orchestrator side. Ex. 'book'\n`;
            str += ` - myField : field provided. Ex. 'f_isbn'\n`;
            str += ` - myValue : value of field. Ex. '978-2-290-16734-2'\n`;
            str += ` - myTargetField : field to be retrieved. Ex. 'f_title'\n`;
            str += `*/\n`;
            str += `let myTargetValue = utils.api.map(myEntity, myField, myValue, myTargetField);\n\n`;
            break;
        case 'update_entity' : // Mettre à jour une entité serveur
            str = "// Update server entity\n";
            str += `let form = {};\n`;
            str += `utils.api.call({\n`;
            str += `    url: '/api/myEntity/myMethod',\n`;
            str += `    method: 'post',\n`;
            str += `    form: form\n`;
            str += `});\n\n`;
            break;
        case 'encrypt' : // Encrypter une variable
            str = "// Encrypt variable value\n";
            str += `let form = {\n`;
			str += `	"value": env.myVariable\n`;
			str += `};\n`;
            str += `await utils.api.call({\n`;
            str += `    url: '/api/task/encrypt',\n`;
            str += `    method: 'post',\n`;
            str += `    form: form\n`;
			str += `}).then(function (data) {\n`;
			str += `	utils.sessionData.myVariableEncrypted = data.response.body;\n`;
			str += `});\n\n`;
            break;
        case 'decrypt' : // Decrypter une variable
            str = "// Decrypt variable value\n";
            str += `let form = {\n`;
			str += `	"value": env.myVariable\n`;
			str += `};\n`;
            str += `await utils.api.call({\n`;
            str += `    url: '/api/task/decrypt',\n`;
            str += `    method: 'post',\n`;
            str += `    form: form\n`;
			str += `}).then(function (data) {\n`;
			str += `	utils.sessionData.myVariableDecrypted = data.response.body;\n`;
			str += `});\n\n`;
            break;
        case 'mouse_move' : // Déplacer la souris à une position donnée
            str = "// Mouse mouse a given position\n";
            // str += `var robot = require("robotjs");\n`;
            // str += `robot.setMouseDelay(2);\n`;
            str += `robot.moveMouse(x, y);\n\n`;
            break;
        case 'mouse_click' : // Cliquer
            str = "// Click\n";
            str += `robot.mouseClick();\n\n`;
            break;
        case 'mouse_right_click' : // Cliquer avec le bouton droit
            str = "// Right click\n";
            str += `robot.mouseClick('right');\n\n`;
            break;
        case 'mouse_double_click' : // Double-cliquer
            str = "// Double Click\n";
            str += `robot.mouseClick('left', true);\n\n`;
            break;
        case 'type_text' : // Saisir du texte
            str = "// Type some text\n";
            str += `robot.typeString('myText');\n\n`;
            break;
        case 'next_step' : // Déclencher une étape
            str = "// Trigger next step\n";
            str += `utils.sessionData.goToStep = stepData.stepIdx + 1;\n\n`;
            break;
        case 'error' : // Interompre le programme en erreur
            str = "// Interupt program with error code\n";
            str += `utils.error('myErrorCode');\n\n`;
            break;
        default:
            break;
    }

    // doc.replaceRange(str, pos);
    var selection = currentMirror.getSelection();

    if(selection.length>0) {
        currentMirror.replaceSelection(str);
    }
    else {
        if (!pos.line) {
            pos.line = doc.lastLine() -2;
        }
        doc.replaceRange(str, pos);
    }

    currentMirror.setValue(js_beautify(currentMirror.getValue()));
};

function add_sequence_variable(v) {

    var str = "";
    var doc = currentMirror.getDoc();
    var cursor = doc.getCursor(); // gets the line number in the cursor position
    var line = doc.getLine(cursor.line); // get the line contents
    var pos = {
        line: cursor.line
    };

    switch (v) {
        case 'step_index':
            str = "utils.stepData.stepIdx";
            break;
        case 'step_serial_number':
            str = "utils.stepData.serialNumber";
            break;
        case 'env':
            str = "utils.env.myVariable";
            break;
        case 'session':
            str = "utils.sessionData.myVariable";
            break;
        default:
            break;
    }

    var selection = currentMirror.getSelection();

    if(selection.length>0) {
        currentMirror.replaceSelection(str);
    }
    else {
        if (!pos.line) {
            pos.line = doc.lastLine();
        }
        doc.replaceRange('\n' + str, pos);
    }

    currentMirror.setValue(js_beautify(currentMirror.getValue()));
}