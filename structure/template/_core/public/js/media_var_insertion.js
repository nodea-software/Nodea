var insertionHandler = {
    field: {
        displaySelector: function(label) {
            var entity = $("select[name=f_target_entity]").find('option:selected').val();
            if (!entity)
                return toastr.warning('Aucune entité n\'est ciblé');

            $.ajax({
                url: '/media/entity_tree/' + entity,
                success: function(entityTree) {
                    /* Create select and options */
                    var fieldSelect = '\
                        <select class="fieldInsertion form-control" name="insertionSelect" data-type="field" data-for="'+$(label).attr('for')+'">\
                            <option value="-1">' + CHOOSE_FIELD + '</option>';
                    for (var i = 0; i < entityTree.length; i++)
                        fieldSelect += '<option value="' + entityTree[i].codename + '">' + entityTree[i].traduction + '</option>';
                    fieldSelect += '</select>';

                    $(label).next('.input-group').append(fieldSelect).find('select').select2({
                        width: '80%'
                    });
                }
            });
        },
        insertValue: function(data) {
            return "{field|" + data.id + "}";
        }
    },
    group: {
        displaySelector: function(label) {
            var groupSelect = '<select class="ajax form-control" data-type="group" name="insertionSelect" data-source="group" data-for="'+$(label).attr('for')+'" data-using="f_label"></select>';
            $(label).next('.input-group').append(groupSelect).css('width', '80%');
            NodeaForms.elements.ajax_select.initializer($(label).next('.input-group').find('select'), CHOOSE_GROUP);
        },
        insertValue: function(data) {
            return "{group|" + data.text + "|" + data.id + "}";
        }
    },
    user: {
        displaySelector: function(label) {
            var userSelect = '<select class="ajax form-control" data-type="user" name="insertionSelect" data-source="user" data-for="'+$(label).attr('for')+'" data-using="f_login,f_email"></select>';
            $(label).next('.input-group').append(userSelect).css('width', '80%');
            NodeaForms.elements.ajax_select.initializer($(label).next('.input-group').find('select'), CHOOSE_USER);
        },
        insertValue: function(data) {
            console.log(data);
            return "{user|" + data.text + "|" + data.id + "}";
        }
    },
    user_target: {
        displaySelector: function(label) {
            var entity = $("select[name=f_target_entity]").find('option:selected').val();
            if (!entity)
                return toastr.warning('Aucune entité n\'est ciblé');

            $.ajax({
                url: '/media/user_tree/' + entity,
                success: function(userTree) {
                    /* Create select and options */
                    var fieldSelect = '\
                        <select class="emailFieldInsertion form-control" name="insertionSelect" data-type="user_target" data-for="'+$(label).attr('for')+'">\
                            <option value="-1">' + CHOOSE_USER_TARGET + '</option>';
                    for (var i = 0; i < userTree.length; i++)
                        fieldSelect += '<option value="' + userTree[i].field + '">' + userTree[i].traduction + '</option>';
                    fieldSelect += '</select>';

                    $(label).next('.input-group').append(fieldSelect).find('select').select2({
                        width: '80%'
                    });
                }
            });
        },
        insertValue: function(data) {
            var userPath = data.id;
            // Remove first and last char being `{` and `}`
            userPath = data.id.substring(1, data.id.length - 1);
            return "{user_target|" + data.text + "|" + userPath + "}";
        }
    },
    phone_field: {
        displaySelector: function(label) {
            var entity = $("select[name=f_target_entity]").find('option:selected').val();
            if (!entity)
                return toastr.warning('Aucune entité n\'est ciblé');

            $.ajax({
                url: '/media/entity_full_tree/' + entity,
                success: function(phoneTree) {
                    /* Create select and options */
                    var fieldSelect = '\
                        <select class="phoneFieldInsertion" name="insertionSelect" data-type="phone_field" data-for="'+$(label).attr('for')+'">\
                            <option value="-1">' + CHOOSE_PHONE_FIELD + '</option>';
                    for (var i = 0; i < phoneTree.length; i++)
                        if (phoneTree[i].isPhone)
                            fieldSelect += '<option value="' + phoneTree[i].codename + '">' + phoneTree[i].traduction + '</option>';
                    fieldSelect += '</select>';

                    $(label).next('.input-group').append(fieldSelect).find('select').select2({
                        width: '80%'
                    });
                }
            });
        },
        insertValue: function(data) {
            return "{phone_field|" + data.id + "}";
        }
    },
    email_field: {
        displaySelector: function(label) {
            var entity = $("select[name=f_target_entity]").find('option:selected').val();
            if (!entity)
                return toastr.warning('Aucune entité n\'est ciblé');

            $.ajax({
                url: '/media/entity_full_tree/' + entity,
                success: function(entityTree) {
                    /* Create select and options */
                    var fieldSelect = '\
                        <select class="emailFieldInsertion" name="insertionSelect" data-type="email_field" data-for="'+$(label).attr('for')+'">\
                            <option value="-1">' + CHOOSE_MAIL_FIELD + '</option>';
                    for (var i = 0; i < entityTree.length; i++)
                        if (entityTree[i].isEmail)
                            fieldSelect += '<option value="' + entityTree[i].codename + '">' + entityTree[i].traduction + '</option>';
                    fieldSelect += '</select>';

                    $(label).next('.input-group').append(fieldSelect).find('select').select2({
                        width: '80%'
                    });
                }
            });
        },
        insertValue: function(data) {
            return "{field|" + data.id + "}";
        }
    },
    file_field: {
        displaySelector: function(label) {
            var entity = $("select[name=f_target_entity]").find('option:selected').val();
            if (!entity)
                return toastr.warning('Aucune entité n\'est ciblé');

            $.ajax({
                url: '/media/entity_full_tree/' + entity,
                success: function(entityTree) {
                    /* Create select and options */
                    var fieldSelect = '\
                        <select class="fileFieldInsertion" name="insertionSelect" data-type="file_field" data-for="'+$(label).attr('for')+'">\
                            <option value="-1">' + CHOOSE_FILE_FIELD + '</option>';
                    for (var i = 0; i < entityTree.length; i++)
                        if (entityTree[i].isFile)
                            fieldSelect += '<option value="' + entityTree[i].codename + '">' + entityTree[i].traduction + '</option>';
                    fieldSelect += '</select>';

                    $(label).next('.input-group').append(fieldSelect).find('select').select2({
                        width: '80%'
                    });
                }
            });
        },
        insertValue: function(data) {
            return "{field|" + data.id + "}";
        }
    }
}

$(function() {

    // Bind select generation on click
    $(".insert").click(function(e) {
        var type = $(this).data('type');
        var forLabel = $(this).data('for');
        var targetLabel = $('label[for="' + forLabel + '"]');

        // Remove previously created selects
        targetLabel.next('.input-group').find('select').eq(0).select2('destroy').remove();
        targetLabel.next('.input-group').nextAll('select').first().select2('destroy').remove();

        // Display new select depending on type
        insertionHandler[type].displaySelector(targetLabel);
    });

    // When target entity change, reload each related select2
    $("select[name=f_target_entity]").on('change', function() {
        $(".fieldInsertion, .emailFieldInsertion, .phoneFieldInsertion, .fileFieldInsertion").each(function() {
            var label = $(this).parent('label');
            var handlerType;
            if ($(this).hasClass('emailFieldInsertion'))
                handlerType = 'email_field';
            else if ($(this).hasClass('phoneFieldInsertion'))
                handlerType = 'phone_field';
            else if ($(this).hasClass('fileFieldInsertion'))
                handlerType = 'file_field';
            else
                handlerType = 'field';

            $(this).select2('destroy').remove();
            insertionHandler[handlerType].displaySelector(label);
        });
    });

    // Insert value in element when option selected
    $(document).on('select2:selecting', 'select[name=insertionSelect]', function(e) {

        var data = e.params.args.data;
        var event = e.params.args.originalEvent;
        var type = $(this).data('type');

        /* Placeholder selection */
        if (data.id == '-1' || data.id == 'nps_clear_select')
            return;

        // Get value to insert from Handler
        var insertValue = insertionHandler[type].insertValue(data);

        var targetElement = $('*[name="'+$(this).data('for')+'"]');

        // Insert if target is input
        if (targetElement.is('input')) {
            var value = targetElement.val();
            value += insertValue;
            targetElement.val(value);
        }
        // Insert if target is textarea
        else if (targetElement.is('textarea')) {
            /* Add new variable to textarea content */
            var rootElement = $('<div>' + targetElement.val() + '</div>');
            var newValue = rootElement.html() + insertValue;
            targetElement.val(newValue);
            // $(targetElement).summernote('code', newValue);
        }
        // Reset selection and close select2 dropdown
        $(this).val(-1).trigger('change');
        $(this).select2('close');

        return false;
    });

    /* Icons */
    function addIcon(icon, content) {
        currentIcon = $("input[name=f_icon]").val();
        content += '\
            <div class="col-2 icon-wrap ' + (icon == currentIcon ? 'label-primary' : '') + ' mb-4" style="text-align: center;">\
                <i class="' + icon + ' fa-2x"></i>\
            </div>';
        return content;
    }

    /* Generate filtered icon list */
    $("#filter").keyup(function() {
        var filter = $(this).val();
        $(".icon-wrap").remove();
        var iconsFiltered = icons.split(',').filter(x => x.includes(filter));
        var newIconsContent = '';

        for (var i = 0; i < iconsFiltered.length; i++)
            newIconsContent = addIcon(iconsFiltered[i], newIconsContent);

        $("#icons .row").append(newIconsContent);

        if (newIconsContent == '')
            $("#icons .row").append('<div class="icon-wrap col-12">' + (lang_user == 'fr-FR' ? 'Aucun résultat' : 'No results...') + '</div>');
    });

    /* Icon selected (clicked) */
    $(document).on('click', '.icon-wrap', function() {
        $("#current-icon").empty();
        $("#current-icon").append($(this).html());
        var iconClass = $(this).find('i').attr('class').replace('fa-2x', '');
        $("input[name='f_icon']").val(iconClass);
    });
});