
// Global module select2 navigation
function navigate(){
    var url = window.document.getElementById('module-select').value; // get selected value
    if (url) {
        window.location = url;
    }
    return false;
}

// Input group addons click
$(document).on("click", ".input-group-prepend", function () {
    $(this).next("input").focus();
});

// Label click trigger concerned input
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

// Copy button
$(document).on("click", ".copy-button", function () {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val($(this).prev("a").text()).select();
    document.execCommand("copy");
    toastr.success('<i class="fa fa-copy"></i> : ' + $(this).prev("a").text() + '</i>')
    $temp.remove();
});

/* --------------- COMPONENT - Document Template  --------------- */
$(document).on('click', ".help-new-window", function() {
    var entityVal = $("[name=f_entity]").val();
    var url = "/document_template/help";
    if (entityVal && entityVal !== "") {
        url += "#"+entityVal;
    }
    window.open(url, "_blank", "toolbar=yes,scrollbars=yes,resizable=yes,top=500,left=500,width=800,height=500");
    return false;
});

/* --------------- COMPONENT - Address  --------------- */
function initComponentAddress(context) {

    var componentAddressConf = {
        url: "https://api-adresse.data.gouv.fr/search/",
        query_parm: 'q',
        type: 'get', // HTTP request type
        addresses: 'features', // objet which contain list of address, if equal '.' whe take response as list,
        address_fields: 'properties', // objet name which contain attributes or '.' ,
        autocomplete_field: 'label', // field of properties, we use this field to select proposition. We can use ',' as separator to display in autocomplete more than one field value,
        enable: true // If  enable, do query and get data, else data should be to set manually by user
    };

    if (!componentAddressConf.enable)
        return;

    $('.address_field', context).on('keyup', function () {
        $(this).val($(this).val().toUpperCase());
    });

    $(".address_search_input", context).each(function () {
        var result;
        var fieldsToShow = componentAddressConf.autocomplete_field.split(',');
        var currentContext = $(this).parents('section.section_address_fields');
        $(this).autocomplete({
            minLength: 1,
            source: function (req, res) {
                var val = $('#address_search_input', currentContext).val();
                var data = {limit: 10};
                data[componentAddressConf.query_parm] = val;
                $.ajax({
                    url: componentAddressConf.url,
                    type: componentAddressConf.type,
                    data: data,
                    dataType: 'json',
                    success: function (data) {
                        result = componentAddressConf.addresses !== '.' ? data[componentAddressConf.addresses] : data;
                        res($.map(result, function (_address) {
                            var objet = componentAddressConf.address_fields !== '.' ? _address[componentAddressConf.address_fields] : _address;
                            var toReturn = '';
                            fieldsToShow.forEach(function (field) {
                                toReturn += objet[field] + ' ';
                            });
                            return toReturn;
                        }));
                    }
                });
            },
            select: function (e, ui) {
                result.forEach(function (_) {
                    var toReturn = '';
                    var _address = componentAddressConf.address_fields !== '.' ? _[componentAddressConf.address_fields] : _;
                    var toReturn = '';
                    fieldsToShow.forEach(function (field) {
                        toReturn += _address[field] + ' ';
                    });
                    if (ui.item.value == toReturn) {
                        for (var key in _address) {
                            if (_address[key] != '') //to prevent to replace default value
                                $('input[field=' + key + ']', currentContext).val((_address[key] + '').toUpperCase());
                        }
                        /** Set Lat and Long value **/
                        $('input[name=f_address_lat]', currentContext).val(_.geometry.coordinates[1]);
                        $('input[name=f_address_lon]', currentContext).val(_.geometry.coordinates[0]);
                        if ((!_address.street || typeof _address.street === "undefined") && _address.name)
                            $("#f_address_street", currentContext).val(_address.name);
                    }
                });
            }
        });
    });

    $('#info_address_maps', context).on('click', function (e) {
        e.preventDefault();
        $.ajax({
            url: '/address_settings/info_address_maps_ajax',
            methode: 'GET',
            success: function (data) {
                if (data && data.message) {
                    var html = '<div class="modal fade" tabindex="-1">';
                    html += '<div class="modal-dialog">';
                    html += '<div class="modal-content">';
                    html += '<div class="modal-header" style="background:#3c8dbc;color:#ffffff">';
                    html += '<h4 class="modal-title">Information</h4>';
                    html += '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
                    html += '</div>';
                    html += '<div class="modal-body">';
                    html += data.message;
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                    $(html).modal('show');
                }
            },
            error: function (e) {}
        });
        return false;
    });

    setTimeout(function () {
        initMapsIfComponentAddressExists(context);
    }, 500);
}

function initMapsIfComponentAddressExists(context) {
    if (!context)
        context = document;

    $('.section_address_fields', context).each(function () {
        var address_context = this;

        var f_address_lat = $(address_context).find('.f_address_lat').val();
        var f_address_lon = $(address_context).find('.f_address_lon').val();
        var f_address_enableMaps = $(address_context).find('.f_address_enableMaps').val();
        if (f_address_lat && f_address_lon && f_address_enableMaps) {
            initComponentAddressMaps(f_address_lat, f_address_lon, address_context);
        } else if ((!f_address_lat || !f_address_lon) && f_address_enableMaps) {
            var info = '<div class="alert bg-gray alert-dismissible " >'
                + '<h4><i class="icon fa fa-exclamation-triangle"></i> ' + $('#f_address_notValid').val() + '</h4>'
                + '<button type="button" class="close" data-dismiss="alert" aria-hidden="true" id="btnDismissInfoInvalidAddress">×</button>'
                + '</div>';
            $('.address_maps', address_context).append(info);
            $('#btnDismissInfoInvalidAddress', address_context).on('click', function () {
                $('.address_maps', address_context).parent().remove();
                $('.address_fields', address_context).removeClass('col-md-6').addClass('col-md-12');
            });
        }
    });
}

// Tool - Init Map on given lat / lon
function initComponentAddressMaps(lat, lon, mapsContext) {
    try {
        $(mapsContext).find('.address_maps').each(function () {
            var that = $(this);
            $(this).empty();
            var control = ol.control.defaults();
            var options = {
                controls: []
            };
            lon = parseFloat(lon);
            lat = parseFloat(lat);

            const markerSource = new ol.source.Vector();
            var markerStyle = new ol.style.Style({
                image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
                    anchor: [0.5, 46],
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'pixels',
                    opacity: 0.75,
                    src: '/img/address_map_marker.png'
                }))
            });
            var iconFeature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.transform([lon, lat], 'EPSG:4326',
                    'EPSG:3857')),
                name: '',
                population: 4000,
                rainfall: 500
            });

            markerSource.addFeature(iconFeature);
            if ($('.f_address_zoomBar', mapsContext).val() === 'true') {
                var zoomSlider = new ol.control.ZoomSlider();
                options.controls.push(zoomSlider)
            }
            if ($('.f_address_mousePosition', mapsContext).val() === 'true') {
                var mousePositionControl = new ol.control.MousePosition({
                    coordinateFormat: ol.coordinate.createStringXY(4),
                    projection: 'EPSG:4326',
                    // comment the following two lines to have the mouse position
                    // be placed within the map.
                    className: 'custom-mouse-position',
                    // target: document.getElementById('mouse-position'),
                    undefinedHTML: '&nbsp;'
                });
                options.controls.push(mousePositionControl);
            }
            var mapConfig = {
                controls: control.extend(options.controls),
                target: that.attr('id'),
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.OSM()
                    }),
                    new ol.layer.Vector({
                        source: markerSource,
                        style: markerStyle,
                    })
                ],
                view: new ol.View({
                    center: ol.proj.fromLonLat([lon, lat]),
                    zoom: 17
                })
            };
            if ($('.f_address_navigation', mapsContext).val() === 'false') {
                mapConfig.interactions = [];
                mapConfig.controls = [];
            }
            var map = new ol.Map(mapConfig);

        });
    } catch (e) {
        console.log(e);
    }
}

/* --------------- UTILS  --------------- */
// Clear string from every special char
function clearString(string) {
    string = string.trim();
    string = string.replace(/\s\s+/g, ' ');
    string = string.replace(/é/g, "e");
    string = string.replace(/è/g, "e");
    string = string.replace(/\ê/g, "e");
    string = string.replace(/\ë/g, "e");
    string = string.replace(/\È/g, "e");
    string = string.replace(/\É/g, "e");
    string = string.replace(/\Ê/g, "e");
    string = string.replace(/\Ë/g, "e");
    string = string.replace(/à/g, "a");
    string = string.replace(/â/g, "a");
    string = string.replace(/ä/g, "a");
    string = string.replace(/\À/g, "a");
    string = string.replace(/\Â/g, "a");
    string = string.replace(/\Ä/g, "a");
    string = string.replace(/ô/g, "o");
    string = string.replace(/ö/g, "o");
    string = string.replace(/î/g, "i");
    string = string.replace(/ï/g, "i");
    string = string.replace(/Î/g, "i");
    string = string.replace(/Ï/g, "i");
    string = string.replace(/û/g, "u");
    string = string.replace(/ù/g, "u");
    string = string.replace(/ü/g, "u");
    string = string.replace(/\Ù/g, "u");
    string = string.replace(/\Ü/g, "u");
    string = string.replace(/\Û/g, "u");
    string = string.replace(/ç/g, "c");
    string = string.replace(/ĉ/g, "c");
    string = string.replace(/\Ç/g, "c");
    string = string.replace(/\Ĉ/g, "c");
    string = string.replace(/'/g, "_");
    string = string.replace(/,/g, "_");
    string = string.replace(/ /g, "_");
    string = string.replace(/-/g, "_");
    string = string.replace(/\\/g, "_");
    string = string.replace(/!/g, "_");
    string = string.replace(/\(/g, "_");
    string = string.replace(/\)/g, "_");
    string = string.replace(/\//g, "_");
    string = string.replace(/\\/g, "_");
    string = string.replace(/\;/g, "_");
    string = string.replace(/\?/g, "_");
    string = string.replace(/\"/g, "_");
    string = string.replace(/\&/g, "_");
    string = string.replace(/\*/g, "_");
    string = string.replace(/\$/g, "_");
    string = string.replace(/\%/g, "_");
    string = string.replace(/\£/g, "_");
    string = string.replace(/\€/g, "_");
    string = string.replace(/\µ/g, "_");
    string = string.replace(/\°/g, "_");
    string = string.replace(/\=/g, "_");
    string = string.replace(/\+/g, "_");
    string = string.replace(/\}/g, "_");
    string = string.replace(/\{/g, "_");
    string = string.replace(/\#/g, "_");
    string = string.replace(/\`/g, "_");
    string = string.replace(/\|/g, "_");
    string = string.replace(/\@/g, "_");
    string = string.replace(/\^/g, "_");
    string = string.replace(/\]/g, "_");
    string = string.replace(/\[/g, "_");
    string = string.replace(/\~/g, "_");
    string = string.replace(/\:/g, "_");
    string = string.replace(/\×/g, "_");
    string = string.replace(/\¿/g, "_");
    string = string.replace(/\¡/g, "_");
    string = string.replace(/\÷/g, "_");
    string = string.replace(/\²/g, "_");
    string = string.replace(String.fromCharCode(65533), "e");
    string = string.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    string = string.toLowerCase();
    return string;
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

/* --------------- DOCUMENT READY --------------- */
$(document).ready(function () {

    /* Save sidebar preference */
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

    $(document).on("click", ".btn-confirm", function () {
        if (confirm(DEL_CONFIRM_TEXT))
            return true;
        return false;
    });

    var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    // Avoid double clicking on dynamic button
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

    /* --------------- Inline Help --------------- */
    var currentHelp, modalOpen = false;
    $(document).delegate(".inline-help", 'click', function () {
        currentHelp = this;
        var entity;
        if ($(this).parents('.tab-pane').length && $(this).parents('.tab-pane').attr('id') != 'home')
            entity = $(this).parents('.tab-pane').attr('id').substring(2);
        else {
            var parts = window.location.href.split('/');
            entity = parts[parts.length - 2];
        }
        var field = $(this).data('field');
        $.ajax({
            url: "/inline_help/help/" + entity + "/" + field,
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
    $("#nextHelp, #prevHelp").click(function () {
        var count = $("#fields .inline-help").length - 1;
        var current = $("#fields .inline-help").index(currentHelp);
        if ($(this).attr('id') == 'nextHelp' && count > current)
            $("#fields .inline-help").eq(current + 1).click();
        else if ($(this).attr('id') == 'prevHelp' && current > 0)
            $("#fields .inline-help").eq(current - 1).click();
    });
    // Handle tab and shift+tab modal navigation
    $("#inlineHelp").on('show.bs.modal', function () {
        modalOpen = true;
    });
    $("#inlineHelp").on('hide.bs.modal', function () {
        modalOpen = false;
    });
    $(document).keypress(function (e) {
        if (modalOpen == false)
            return;
        var code = e.keyCode || e.which;
        // Tabulation
        if (e.shiftKey && code == '9')
            $("#prevHelp").click();
        else if (code == '9')
            $("#nextHelp").click();
    });

    /* --------------- Toastr messages --------------- */
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

    /* --------------- Breadcrumbs / sidebar --------------- */
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
});