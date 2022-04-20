
// Global module select2 navigation
function navigate(){
    var url = window.document.getElementById('module-select').value; // get selected value
    if (url) {
        window.location = url;
    }
    return false;
}

// Generate and open a modal
function doModal(title, content) {
    $('#tmp_text_modal').remove();
    var modal_html = '\
    <div id="tmp_text_modal" class="modal fade" tabindex="-1">\
        <div class="modal-dialog">\
            <div class="modal-content">\
                <div class="modal-header">\
                    <h4>' + title + '</h4>\
                    <a class="close" data-dismiss="modal">×</a>\
                </div>\
                <div class="modal-body">\
                    <p>' + content.replace(/(?:\r\n|\r|\n)/g, '<br>') + '</p>\
                </div>\
                <div class="modal-footer">\
                    <span class="btn btn-default" data-dismiss="modal">\
                        '+(lang_user === 'fr-FR' ? 'Fermer' : 'close')+'\
                    </span>\
                </div>\
            </div>\
        </div>\
    </div>';
    $("body").append(modal_html);
    $("#tmp_text_modal").modal();
}

// File viewer generation
function generateFileViewer(base64) {
    var raw = window.atob(base64);
    var rawLength = raw.length;
    var array = new Uint8Array(new ArrayBuffer(rawLength));

    for (var i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }

    var binaryData = [];
    binaryData.push(array);
    var dataPdf = window.URL.createObjectURL(new Blob(binaryData, {
        type: "application/pdf"
    }))
    return dataPdf;
}

/**
 * enables = {
 *  inputGroup: true,
 *  labelFocus: true,
 *  copyBtn: true,
 *  confirmBtn: true,
 *  documentTemplateHelp: true,
 *  blockDoubleClick: true,
 *  inlineHelp: true,
 *  toastr: true,
 *  sidebar: true,
 *  sidebarSave: true
 * }
 */
var Nodea = (enables = {}) => {
    $(function() {
        // Input group addons click
        if (enables.inputGroup !== false) {
            $(document).on("click", ".input-group-prepend", function () {
                $(this).next("input").focus();
            });
        }

        // Label click trigger concerned input
        if (enables.labelFocus !== false) {
            $(document).on("click", "div:not([data-field='']) .form-group label", function () {
                let htmlType = ["input", "textarea", "select"]
                let input;
                for (var i = 0; i < htmlType.length; i++) {
                    if ($(this).parent().find(htmlType[i] + "[name='" + $(this).attr("for") + "']").length != 0) {
                        input = $(this).parent().find(htmlType[i] + "[name='" + $(this).attr("for") + "']");
                        break;
                    }
                }
                if (typeof input !== "undefined") {
                    switch (input.attr("type")) {
                        case "checkbox":
                            if (!input.prop("disabled"))
                                input.icheck("toggle");
                            break;
                        default:
                            if (!input.prop("readonly"))
                                input.focus();
                            else
                                input.select();
                            break;
                    }
                }
            });
        }

        // Copy button
        if (enables.copyBtn !== false) {
            $(document).on("click", ".copy-button", function () {
                var $temp = $("<input>");
                $("body").append($temp);
                $temp.val($(this).prev("a").text()).select();
                document.execCommand("copy");
                toastr.success('<i class="fa fa-copy"></i> : ' + $(this).prev("a").text() + '</i>')
                $temp.remove();
            });
        }

        // Confirm alert on btn-confirm
        if (enables.confirmBtn !== false) {
            $(document).on("click", ".btn-confirm", function () {
                if (confirm(DEL_CONFIRM_TEXT))
                    return true;
                return false;
            });
        }

        // Document Template help
        if (enables.documentTemplateHelp !== false) {
            $(document).on('click', ".help-new-window", function() {
                var entityVal = $("[name=f_entity]").val();
                var url = "/document_template/help";
                if (entityVal && entityVal !== "") {
                    url += "#"+entityVal;
                }
                window.open(url, "_blank", "toolbar=yes,scrollbars=yes,resizable=yes,top=500,left=500,width=800,height=500");
                return false;
            });
        }

        // Avoid double clicking on dynamic button
        if (enables.blockDoubleClick !== false) {
            var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
            if (!isChrome)
                $(document).on("click", ".btn.btn-primary, .btn.btn-default, .btn.btn-info, .btn.btn-warning, .btn.btn-danger, .btn.btn-success", function () {
                    var context = this;
                    $(this).prop("disabled", true);
                    $(this).css("cursor", "wait");
                    var tmpText = $(this).html();
                    if (!/Edge/.test(navigator.userAgent) && !isChrome)
                        $(this).html("<i class='fa fa-spinner fa-spin'></i>");
                    setTimeout(function () {
                        $(context).prop("disabled", false);
                        $(context).css("cursor", "pointer");
                        if (!/Edge/.test(navigator.userAgent) && !isChrome)
                            $(context).html(tmpText);
                    }, 1000);
                    return true;
                });
        }

        // Inline Help
        if (enables.inlineHelp !== false) {
            let currentHelp, modalOpen = false;

            $(document).on('click', '.inline-help', function () {
                currentHelp = this;
                let url = "/inline_help/help/" + $(this).data('entity') + "/" + $(this).data('field'),
                method = 'GET',
                data = null;

                // If data-content exist then we are looking for associated translate key instead of standard inline-help
                if($(this).data('content')) {
                    url = '/app/translate';
                    method = 'POST';
                    data = {
                        lang: lang_user,
                        key: $(this).data('content'),
                        params: []
                    };
                }

                $.ajax({
                    url,
                    method,
                    data,
                    success: function (content) {
                        $("#prevHelp, #nextHelp").hide();
                        var totalHelp = $(".inline-help").length - 1;
                        var currentIdx = $(".inline-help").index(currentHelp);
                        if (totalHelp - currentIdx > 0)
                            $("#nextHelp").show();
                        if (currentIdx > 0)
                            $("#prevHelp").show();
                        $(".modal-title").html($(currentHelp).parents('label').text());
                        $(".modal-body").html(content);
                        $("#inlineHelp").modal('show');
                    }
                });
            });

            // Prev/next Help en ligne buttons
            $("#nextHelp, #prevHelp").on('click', function () {
                var count = $("#fields .inline-help").length - 1;
                var current = $("#fields .inline-help").index(currentHelp);
                if ($(this).attr('id') == 'nextHelp' && count > current)
                    $("#fields .inline-help").eq(current + 1).trigger('click');
                else if ($(this).attr('id') == 'prevHelp' && current > 0)
                    $("#fields .inline-help").eq(current - 1).trigger('click');
            });

            // Handle tab and shift+tab modal navigation
            $("#inlineHelp").on('show.bs.modal', function () {
                modalOpen = true;
            });

            $("#inlineHelp").on('hide.bs.modal', function () {
                modalOpen = false;
            });

            $(document).on('keypress', function (e) {
                if (modalOpen == false)
                    return;
                // Tabulation
                if (e.shiftKey && e.key == '9')
                    $("#prevHelp").trigger('click');
                else if (e.key == '9')
                    $("#nextHelp").trigger('click');
            });
        }

        // Toastr messages
        if (enables.toastr !== false) {
            try {
                toastr.options = {
                    "closeButton": false,
                    "debug": false,
                    "newestOnTop": false,
                    "progressBar": true,
                    "positionClass": "toast-bottom-left",
                    "preventDuplicates": true,
                    "onclick": null,
                    "showDuration": "400",
                    "hideDuration": "1000",
                    "timeOut": "5000",
                    "extendedTimeOut": "1000",
                    "showEasing": "swing",
                    "hideEasing": "linear",
                    "showMethod": "fadeIn",
                    "hideMethod": "fadeOut"
                };
                for (var i = 0; i < toastrArray.length; i++) {
                    setTimeout(function (toast) {
                        switch (toast.level) {
                            case "info":
                                toastr.info(toast.message);
                                break;
                            case "success":
                                toastr.success(toast.message);
                                break;
                            case "warning":
                                toastr.warning(toast.message);
                                break;
                            case "error":
                                toastr.error(toast.message);
                                break;
                        }
                    }(toastrArray[i]), (1000 * i));
                }
            } catch (e) {
                console.log(e);
                toastr = {
                    success: function () {
                        return true;
                    },
                    info: function () {
                        return true;
                    },
                    error: function () {
                        return true;
                    },
                    warning: function () {
                        return true;
                    }
                };
            }
        }

        // Breadcrumbs / sidebar
        if (enables.sidebar !== false) {
            // Open sidebar depending on url location
            $('aside.main-sidebar .sidebar a.nav-link').each(function() {
                if($(this).attr('href') == window.location.pathname) {
                    $(this).css("color", "#3c8dbc").parents('li').addClass("menu-open");
                } else {
                    // If precise URL not found, then open only the concerned menu if found
                    var splitURL = window.location.pathname.split('/');
                    if($(this).attr('href').includes('/' + splitURL[1] + '/'))
                        $(this).parents('li').addClass("menu-open");
                }
            });
        }

        // Save sidebar preference
        if (enables.sidebarSave !== false) {
            $(document).on("click", ".sidebar-toggle", function () {
                var currentState = localStorage.getItem("nodea_sidebar_preference");
                if(!currentState)
                    currentState = 'close';
                else if (currentState == 'open')
                    currentState = "close";
                else {
                    // Reset default select2 width
                    $('#module-select').next('span.select2').css('width', '100%');
                    currentState = "open";
                }

                localStorage.setItem("nodea_sidebar_preference", currentState);
            });
        }
    });
}
