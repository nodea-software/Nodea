let maskMoneyPrecision = 2;
let ctpQrCode = 0;

function firstElementFocus(tab, idx) {
    if(!idx)
        idx = 0;
    var element = $(".form-group:eq("+idx+") label:eq(0)", tab).next().focus();
    if ((element && (element.prop('disabled') == true || element.prop('readonly') == true))
    && ($(".form-group", tab).length > 0 && idx <= $(".form-group", tab).length))
        firstElementFocus(idx+1);
}

const addressMapsInstance = [];
function initMap(mapElement, options) {
	// Dynamically load OpenLayer script to avoid unnecessarily loading it on pages without addresses or even without maps enabled
	if (!this.isOpenLayerLoaded) {
		$.getScript('/js/plugins/ol/ol.js', _ => {
			this.isOpenLayerLoaded = true;
			initMap(mapElement, options)
		});
		return;
	}
	let {
		lat,
		lon,
		zoomBar = true,
		mousePosition = true,
		navigation = true
	} = options;

	if (!lat || !lon)
		return console.error("Missing latitude or longitude to init map");

    mapElement.empty();
    const mapControls = [];
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
    if (zoomBar === true) {
        var zoomSlider = new ol.control.ZoomSlider();
        mapControls.push(zoomSlider)
    }
    if (mousePosition === true) {
        var mousePositionControl = new ol.control.MousePosition({
            coordinateFormat: ol.coordinate.createStringXY(4),
            projection: 'EPSG:4326',
            // comment the following two lines to have the mouse position
            // be placed within the map.
            className: 'custom-mouse-position',
            // target: document.getElementById('mouse-position'),
            undefinedHTML: '&nbsp;'
        });
        mapControls.push(mousePositionControl);
    }
    const control = ol.control.defaults();
    const mapConfig = {
        controls: control.extend(mapControls),
        target: mapElement.attr('id'),
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
    if (navigation === false) {
        mapConfig.interactions = [];
        mapConfig.controls = [];
    }
    var map = new ol.Map(mapConfig);
    addressMapsInstance.push(map);
    return map;
}

function ajax_select(select, placeholder) {
    if (!placeholder)
        placeholder = SELECT_DEFAULT_TEXT;

    var searchField = select.data('using') && select.data('using').split(',') || 'id';

    // Use custom url on select or build default url
    var url = select.data('href') ? select.data('href') : select.data('url') ? select.data('url') : '/' + select.data('source') + '/search';
    select.select2({
        placeholder: placeholder,
        allowClear: true,
        ajax: {
            url: url,
            dataType: 'json',
            method: 'POST',
            delay: 250,
            contentType: "application/json",
            data: function (params) {
                var ajaxdata = {
                    search: params.term,
                    page: params.page || 1,
                    searchField: searchField
                };
                // customwhere example: data-customwhere='{"myField": "myValue"}'
                // Do not work for related to many fields if the field is a foreignKey !
                if (select.data('customwhere') !== undefined) {
                    // Handle this syntax: {'myField': 'myValue'}, JSON.stringify need "", no ''
                    if (typeof select.data('customwhere') === "object")
                        ajaxdata.customwhere = JSON.stringify(select.data('customwhere'));
                    else
                        ajaxdata.customwhere = JSON.stringify(JSON.parse(select.data('customwhere').replace(/'/g, '"')));
                }
                return JSON.stringify(ajaxdata);
            },
            processResults: function (answer, params) {
                var dataResults = answer.rows;
                if (!dataResults)
                    return {results: []};
                var results = [];
                if (select.attr("multiple") != "multiple" && !params.page)
                    results.push({id: "nps_clear_select", text: placeholder});
                for (var i = 0; i < dataResults.length; i++) {
                    var text = [];
                    for (var field in dataResults[i]) {
                        if (searchField.indexOf(field) != -1) {
                            if (dataResults[i][field] != null)
                                text.push(dataResults[i][field]);
                        }
                    }
                    text = text.join(' - ');
                    if (text == "" || text == null)
                        text = dataResults[i].id;

                    results.push({id: dataResults[i].id, text: text});
                }

                return {
                    results: results,
                    pagination: {more: answer.more}
                };
            },
            cache: true
        },
        minimumInputLength: 0,
        escapeMarkup: function (markup) {
            return markup;
        },
        templateResult: function (data) {
            return data.text;
        }
    });

    // Clear select if default option is chosen, do not work natively with select2
    if (select.attr("multiple") != "multiple")
        select.on('change', function () {
            if ($(this).val() == 'nps_clear_select')
                $(this).val(null).trigger('change');
        });
}

var NodeaForms = (_ => {
	function fullElementList(overrideDefaults = {}) {
		return Object.entries({...defaults.elements, ...overrideDefaults.elements}).map(([key]) => key);
	}

	// Check if a string has a valid JSON syntax to parse it
	function isValidJSON(string) {
		if (/^[\],:{}\s]*$/.test(string.replace(/\\["\\\/bfnrtu]/g, '@')
				.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
				.replace(/(?:^|:|,)(?:\s*\[)+/g, '')))
			return true;
		else
			return false;
	}

	// Handle form submission
	function handleSubmit(form, event, overrideDefaults = {}) {
        // Prevent multiple submission (double click)
        if (form.data('submitting') === true) {
            event.preventDefault();event.stopProppagation();
            return false;
        }
        form.data('submitting', true);

        let enableTmsp;
        function enableForm() {
        	if (enableTmsp)
        		clearTimeout(enableTmsp);
            form.data('submitting', false);
        }
        // Re-enable form after some time in case something went wrong
        enableTmsp = setTimeout(enableForm, 3000);

        // Invalid form, block submission
        if (!validate(form, overrideDefaults)) {
            enableForm();
            return false;
        }

        // Valid form, submit as ajax or return true
        if (form.hasClass('ajax')) {
        	const handleSuccess = overrideDefaults.handleSuccess || defaults.handleSuccess;
        	const handleError = overrideDefaults.handleError || defaults.handleError;
    		const originAction = form.attr('action');
        	let action;
        	try {
        		const currentTab = NodeaTabs.current.tab;
        		action = originAction.includes('?')
        			? originAction + '&ajax=true&' + NodeaTabs.buildAssociationHref(currentTab)
        			: originAction + '?ajax=true&' + NodeaTabs.buildAssociationHref(currentTab)
        	} catch (err) {
        		action = originAction.includes('?')
        			? originAction + '&ajax=true'
        			: originAction + '?ajax=true'
        	}
    		let ajaxOptions = {
	            url: action,
	            method: form.attr('method') || 'post',
	            success: function (...args) {
	            	enableForm();
	            	handleSuccess(...args)
	            },
	            error: function(...args) {
	                enableForm();
	                handleError(...args);
	            },
	            timeout: 15000
	        }
	        // Form contains files, we can't just serialize
	        if (form.attr('enctype') === 'multipart/form-data') {
	        	ajaxOptions = {
	        		...ajaxOptions,
		            processData: false,
		            contentType: false,
		            enctype: form.attr('enctype'),
		            data: new FormData(form[0])
	        	}
	        }
	        else
	        	ajaxOptions.data = form.serialize();
	        $.ajax(ajaxOptions);
	        return false;
        }
        return true;
	}

	// Ajax form default success callback
	function handleSuccess(data) {
		try {
			const currentTab = NodeaTabs.current.tab;
			if (currentTab) {
				NodeaTabs.closeOverlay();
				NodeaTabs.reloadTab();
			}
		} catch (err) {
			console.error(err);
		}
	}

    // Server side you can:
    // Show an error message: return res.status(500).send("My Error Message");
    // Show multiple message: return res.status(500).send([{message: "Message One",level: "warning"}, {message: "Message Two",level: "error"}, ...]);
    // You can also force the page to refresh like this: return res.status(500).send({refresh: true});
	function handleError(error, par2, par3) {
		try {
			if (isValidJSON(error.responseText)) {
				var errorObj = JSON.parse(error.responseText);
				if (errorObj.refresh)
					return location.reload();
				if (errorObj instanceof Array) {
					for (var i = 0; i < errorObj.length; i++)
						toastr[errorObj[i].level](errorObj[i].message);
				} else
					toastr.error(error.responseText);
			} else {
				if (typeof error.responseText === "string")
					return toastr.error(error.responseText);
				throw 'unknown';
			}
		} catch (e) {
			console.error(error, par2, par3);
			return toastr.error(ERROR_MSG)
		}
	}

	function validate(form, overrideDefaults = {}) {
		let isValid = true;
		const formModifications = [];
		// Get list of element merged from defaults and overrideDefaults
		const elementsList = fullElementList(overrideDefaults);
		// For each element, call provided or default validator
		for (const element of elementsList) {
			const overrideElement = overrideDefaults.elements && overrideDefaults.elements[element];
			let {selector, initializer, validator} = defaults.elements[element] || {};
			selector = (overrideElement && overrideElement.selector) || selector || "";
			validator = (overrideElement && overrideElement.validator) || validator || (_ => {});
			form.find(selector).each(function() {
				const element = $(this);
				const res = validator(element, form);
				if (res === false)
					isValid = false;
				else if (Array.isArray(res) && res.length)
					formModifications.push(...res);
			});
		}

		// Invalid form, block submission
		if (!isValid)
			return false;
		// Valid form, apply modifications before submitting
        for (const formModification of formModifications)
            formModification();
        return true;
    }

	const defaults = {
		handleSubmit,
		handleSuccess,
        handleError,
        validate,
		// Each element is represented by an object of {selector, initializer, validator}
		elements: {
			ajax_select: {
				selector: "select.ajax",
				initializer: (element, placeholder) => {
					if (typeof element.data("select2") === "undefined")
						ajax_select(element, placeholder);
				},
				validator: (element, form) => {
					const val = element.val();
					if (val !== null && val.length)
						return;
					return [_ => {
						const input = $(`<input type="hidden" name="${element.attr('name')}" value="">`);
						form.append(input);
					}];
				}
			},
			select: {
				selector: "select:not(.ajax):not(.regular-select):not(.custom-select)",
				initializer: (element) => {
					if (typeof element.data("select2") === "undefined")
						element.select2();
				},
				validator: (element, form) => {
					const val = element.val();
					if (val !== null && val.length)
						return;
				}
			},
			checkbox: {
				selector: "input[type='checkbox']:not(.no-icheck)",
				initializer: (element) => {
					element.icheck({
						checkboxClass: 'icheckbox_flat-blue',
						disabledClass: ''
					});
				},
				validator: (element, form) => {
					const modifications = [];
					if (!element.hasClass("no-formatage")) {
						if (element.prop("checked"))
							modifications.push(_ => element.val(true));
						else
							modifications.push(_ => {
								/* Set to checked so it is included in req.body */
								element.prop("checked", true);
								element.val(false);
							});
					}
					else {
						// If it's a multiple checkbox, we have to set an empty value in the req.body if no checkbox are checked
						if ($("input[type='checkbox'][name='" + element.attr("name") + "']").length > 0) {
							if ($("input[type='checkbox'][name='" + element.attr("name") + "']:enabled:checked").length == 0) {
								modifications.push(_ => {
									var input = $("<input>").attr("type", "hidden").attr("name", element.attr("name"));
									form.append(input);
								});
							}
						}
					}
					return modifications;
				}
			},
			radio: {
				selector: "span.radio-group[data-radio]",
				initializer: (element) => {
					element.find('input[type="radio"]').each(function() {
						$(this).icheck({
							radioClass: 'iradio_flat-blue',
							disabledClass: ''
						});
					});
					// If no radio checked, checked the first one
					if(element.find(`input[type='radio']:checked`).length == 0)
						element.find('input[type="radio"]').first().icheck('checked');
				}
			},
			relatedtomany_checkbox: {
				selector: ".relatedtomany-checkbox",
				initializer: (element) => {
					// Splitting display in col-xs-3 related to many checkbox
					var checkboxes = element.find('wrap');
					for (var i = 0; i < checkboxes.length; i += 3) {
						checkboxes.slice(i, i + 3).wrapAll("<div class='col-xs-3' style='margin-bottom: 15px;'></div>");
					}
				},
				validator: (element, form) => {
					if (element.attr('required') != 'required')
						return;
					let checkedFound = false;
					element.find('input[type="checkbox"]').each(function() {
						if ($(this).icheck('update')[0].checked)
							checkedFound = true;
					});
					if (!checkedFound)
						toastr.error(REQUIRED_RELATEDTOMANYCHECKBOX);
					return checkedFound;
				}
			},
			textarea: {
				selector: "textarea:not(.regular-textarea):not(.note-codable)",
				initializer: (element) => {
					let toolbar = [
						['style', []],
						['font', ['bold', 'underline', 'clear']],
						['fontname', ['fontname']],
						['color', ['color']],
						['para', ['ul', 'ol', 'paragraph']],
						['table', []],
						['insert', ['link']],
						['view', ['fullscreen', 'codeview', 'help']],
						['custom', ['stt']]
					];
					if (element.hasClass("no-toolbar"))
						toolbar = [];
					element.summernote({
						height: 200,
						toolbar: toolbar,
						callbacks: {
							onPaste: function(e) {
								// Avoid paste code from ms word or libreoffice that would break some ihm feature
								// Only copy / paste plain text
								var bufferText = ((e.originalEvent || e).clipboardData || window.clipboardData).getData('Text');
								e.preventDefault();
								setTimeout(function() {
									document.execCommand('insertText', false, bufferText);
								}, 10);
							}
						}
					});
				}
			},
			number: {
				selector: "input[type='number']",
				initializer: (element) => {
					element.on('keyup', function() {
						if (typeof element.data("custom-type") === "undefined" && element.val().length > 10) {
							element.val(element.val().slice(0, 10));
						} else if (element.data("custom-type") == "bigint" && element.val().length > 19) {
							element.val(element.val().slice(0, 19));
						}
					});
				}
			},
			decimal: {
				selector: "input[data-custom-type='decimal']",
				initializer: (element) => {
					const decimalRegx = new RegExp("^-?[0-9]+([\.\,][0-9]*)?$");
					element.on('keyup', function() {
						while ($(this).val() != "" && $(this).val() != "-" && !decimalRegx.test($(this).val()))
							$(this).val($(this).val().substring(0, $(this).val().length - 1));
						$(this).val($(this).val().replace(',', '.'));
					});
				}
			},
			email: {
				selector: "input[data-type='email']",
				initializer: (element) => {
					element.inputmask({
						alias: "email"
					});
				},
				validator: (element, form) => {
					if (element.val().length > 0 && !element.inputmask("isComplete")) {
						element.css("border", "1px solid red").parent().after("<span style='color: red;'>Le champ est incomplet.</span>");
						return false;
					} else
						element.css("border", "1px solid black").parent().find('span').remove();
				}
			},
			phone: {
				selector: "input[type='tel']",
				initializer: (element) => {
					element.inputmask({
						mask: "99 99 99 99 99"
					});
				},
				validator: (element, form) => {
					const telRegex = new RegExp(/^(?:(?:\+|00)33[\s.-]{0,3}(?:\(0\)[\s.-]{0,3})?|0)[1-9](?:(?:[\s.-]?\d{2}){4}|\d{2}(?:[\s.-]?\d{3}){2})$/);
					if (element.val().length > 0 && (!element.inputmask("isComplete") || !telRegex.test(element.val()))) {
						element.css("border-color", "red").parent().after("<span style='color: red;'>Le champ est incorrect.</span>");
						$([document.documentElement, document.body]).animate({
							scrollTop: element.offset().top
						}, 500);
						return false;
					} else
						element.css("border-color", "#d2d6de").parents('.form-group').find('span').remove();
				}
			},
			picture: {
				selector: 'img[data-type="picture"]',
				initializer: (element) => {
					var src = element.attr('src');
					//remove all pictures with null src value
					if (typeof src !== 'undefined' && src.split(',')[1] == '') {
						const msg = lang_user == 'fr-FR' ? 'Aucune image choisie' : 'No image selected';
						element.parent().replaceWith('<span>' + msg + '</span>');
					}
				}
			},
			file_preview: {
				selector: '.preview_file',
				initializer: (element) => {
					element.click(_ => {
				        const downloadParams = `entity=${element.data('entity')}&field=${element.data('field')}&id=${element.data('id')}`;
				        $.ajax({
				            url: '/app/get_file?'+downloadParams,
				            type: 'GET',
				            success: function (result) {
				                let fileDisplay;
				                if(result.file.substring(result.file.length, result.file.length - 4).toLowerCase() == '.pdf') {
				                    var binaryPDF = generateFileViewer(result.data);
				                    fileDisplay = '<iframe src=/js/plugins/pdf/web/viewer.html?file=' + encodeURIComponent(binaryPDF) + ' style="width:100%;min-height:500px !important;" allowfullscreen webkitallowfullscreen ></iframe>';
				                }
				                else
				                	fileDisplay = '<p><img class="img-fluid" src=data:image/;base64,' + result.data + ' alt=' + result.file + '/></p>';
				                doModal(
				                	result.file,
				                	`${fileDisplay}<a href="/app/download?${downloadParams}" class="btn btn-primary"><i class="fa fa-download"></i>&nbsp;&nbsp;${lang_user == 'fr-FR' ? 'Télécharger le fichier' : "Download file"}</a>
				                `);
				            },
				            error: console.error
				        });
			        });
				}
			},
			timepicker: {
				selector: ".timepicker",
				initializer: (element) => {
					element.datetimepicker({
						format: 'HH:mm'
					});
					element.inputmask({
						inputFormat: "h2:mm",
						alias: 'datetime',
						placeholder: "hh:mm",
					});
				}
			},
			datepicker: {
				selector: '.datepicker',
				initializer: (element) => {
					let pickerOpts, mask;
					if (lang_user == 'fr-FR') {
						pickerOpts = {
							format: "DD/MM/YYYY"
						};
						mask = {
							inputFormat: "dd/mm/yyyy",
							alias: 'datetime',
							placeholder: "jj/mm/aaaa"
						};
					} else {
						pickerOpts = {
							format: "YYYY-MM-DD"
						};
						mask = {
							inputFormat: "yyyy-mm-dd",
							alias: 'datetime',
							placeholder: "yyyy-mm-dd"
						};
					}

					// Init
					element.datetimepicker(pickerOpts);
					element.inputmask(mask);

					// Default date
					if (element.attr("data-today") == 1)
						element.datetimepicker("defaultDate", moment());
				},
				validator: (element, form) => {
					if (lang_user !== "fr-FR" || element.val().length === 0)
						return;
					/* Datepicker FR convert*/
					const modifications = [];
					modifications.push(_ => element.prop("readOnly", true));

					var date = element.val().split("/");
					if (date.length > 1) {
						var newDate = date[2] + "-" + date[1] + "-" + date[0];

						// Remove mask to be able to transform the date
						modifications.push(_ => element.inputmask('remove'));
						modifications.push(_ => element.val(newDate));
					}
					return modifications;
				}
			},
			datetimepicker: {
				selector: '.datetimepicker',
				initializer: (element) => {
					let pickerOpts, mask;
					if (lang_user == 'fr-FR') {
						pickerOpts = {
							format: "DD/MM/YYYY HH:mm",
							sideBySide: true
						};
						mask = {
							inputFormat: "dd/mm/yyyy h2:mm",
							alias: 'datetime',
							placeholder: "jj/mm/aaaa hh:mm",
						};
					} else {
						pickerOpts = {
							format: "YYYY-MM-DD HH:mm",
							sideBySide: true
						};
						mask = {
							inputFormat: "yyyy-mm-dd h2:mm",
							alias: 'datetime',
							placeholder: "yyyy-mm-dd hh:mm",
						};
					}
					// Init
					element.datetimepicker(pickerOpts);
					element.inputmask(mask);
					// Default date
					if (element.attr("data-today") == 1)
						element.datetimepicker("defaultDate", moment());
				},
				validator: (element) => {
					if (element.val().length === 0)
						return;
					const modifications = []
						// Sécurité
					modifications.push(_ => element.prop("readOnly", true))

					var date = element.val().split("/");
					if (date.length > 1) {
						var yearDate = date[2].split(" ");
						var newDate = yearDate[0] + "-" + date[1] + "-" + date[0] + " " + yearDate[1];

						// Remove mask to enable to transform the date
						modifications.push(_ => element.inputmask('remove'));
						modifications.push(_ => element.val(newDate));
					}
					return modifications;
				}
			},
			qrcode: {
				selector: "input[data-type='qrcode']",
				initializer: (element) => {
					if (element.val() === '')
						return;
					// Update View, set attr parent id, Qrcode only work with component Id
					element.parent().parent().attr("id", element.attr('name') + ctpQrCode);
					var qrcode = new QRCode(element.attr('name') + ctpQrCode, {
						text: element.val(),
						width: 128,
						height: 128,
						colorDark: "#000000",
						colorLight: "#ffffff",
						correctLevel: QRCode.CorrectLevel.H
					});
					element.parent().replaceWith(qrcode);
					ctpQrCode++;
				}
			},
			barcode: {
				selector: "input[data-type='barcode']",
				initializer: (element) => {
					if (element.attr('show') == 'true' && element.val() != '') {
						var jq_element = element;
						var id = jq_element.attr('name');
						var img = '<br><img id="' + id + '" class="img-fluid"/>';
						var barcodeType = jq_element.attr('data-custom-type');
						if (typeof barcodeType != 'undefined') {
							jq_element.parent().after(img);
							try {
								JsBarcode('#' + id, jq_element.val(), {
									format: barcodeType,
									lineColor: "#000",
									width: 2,
									height: 40,
									displayValue: true
								});
								jq_element.parent().remove();
							} catch (e) {
								console.error(e);
								jq_element.parent().parent().find('br').remove();
								jq_element.parent().parent().find('#' + id).remove();
							}
						}
					} else if (element.attr('data-custom-type') === 'code39') {
						element.on('keyup', function() {
							element.val(element.val().toUpperCase());
						});
					}
				},
				validator: (element, form) => {
					var val = element.val();
					var customType = element.attr('data-custom-type');
					if (val == '' || typeof customType === 'undefined')
						return;
					var error = false,
						len, message = "";
					switch (customType) {
						case 'ean8':
							var len = 8;
							error = val.length === len ? false : true;
							if (error)
								message += " Le champ " + element.attr("placeholder") + " doit avoir une taille égale à " + len + ".";
							break;
						case 'isbn':
						case 'issn':
						case 'ean13':
							len = 13;
							error = val.length === len ? false : true;
							if (error)
								message += "Le champ " + element.attr("placeholder") + " doit avoir une taille égale à " + len + ".<br>";
							if (customType === "issn" && !val.startsWith('977')) {
								error = true;
								message += "Le champ " + element.attr("placeholder") + " doit comencer par 977.";

							}
							break;

						case 'upca':
							len = 12;
							error = val.length === len ? false : true;
							if (error)
								message += " Le champ " + element.attr("placeholder") + " doit avoir une taille égale à " + len + ".";
							break;
						case 'code39':
							var reg = new RegExp('\\[A-Z0-9-. $\/+]\\*', 'g');
							if (!(/^[A-Z0-9-. $\/+]*$/).test(val)) {
								message += " Le champ " + element.attr("placeholder") + " doit respècter la norme code39.";
								error = true;
							}
							break;
						case 'code128':
							if (!(/^[\x00-\x7F]*$/).test(val)) {
								message += " Le champ " + element.attr("placeholder") + " doit respècter la norme code128.";
								error = true;
							}
							break;
					}

					if (error) {
						toastr.error(message);
						return false;
					}
				}
			},
			currency: {
				selector: "input[data-type='currency']",
				initializer: (element) => {
					var val = element.val();
					//Fix display maskMoney bug with number and with zero
					if (val || val != '') {
						var partsOfVal = val.split('.');
						if (partsOfVal[1] && (partsOfVal[1].length < maskMoneyPrecision)) {
							for (var i = partsOfVal[1].length; i < maskMoneyPrecision; i++)
								val += '0';
						}
					}
					element.val(val);
					element.maskMoney({
						thousands: ' ',
						decimal: '.',
						allowZero: true,
						suffix: '',
						precision: maskMoneyPrecision
					}).maskMoney('mask');
				},
				validator: (element, form) => {
					//replace number of zero by maskMoneyPrecision value, default 2
					return [_ => {
						element.val(element.val().replace(/ /g, '').replace(',00', ''));
					}]
				}
			},
			url: {
				selector: "input[type='url']",
				initializer: (element) => {
					element.blur(function() {
						var currentUrl = element.val();
						if (currentUrl != "" && currentUrl.indexOf("http://") == -1 && currentUrl.indexOf("https://") == -1) {
							if (currentUrl.indexOf("://") != -1) {
								var toKeep = currentUrl.split("://")[1];
								element.val("http://" + toKeep);
							} else {
								element.val("http://" + currentUrl);
							}
						}
					})
				},
				validator: (element, form) => {
					if (element.val() != '' && !element.inputmask("isComplete")) {
						toastr.error(" Le champ " + element.attr("placeholder") + " est invalide");
						return false;
					}
				}
			},
			file: {
				selector: '.nodea-dropzone',
				initializer: (element) => {
					const dropzone = element;
					const input = element.parents('.form-group').find('input[type=file]');
					const form = input.parents('form');
					const isImage = dropzone.hasClass('image');
					const acceptedFormats = isImage ? ['image/gif','image/png','image/jpeg'] : null; // null is all

					// Ensure form enctype accepts files
					if (form.attr('enctype') !== 'multipart/form-data')
						form.attr('enctype', 'multipart/form-data');

					// Redirect click to file input
					dropzone.click(function(e) {
						if (!$(e.target).is(".remove-file"))
							input.click();
					});
					// Handle drag and drop
					dropzone.on('dragover', function(e) {
						e.preventDefault();
						$(this).addClass('dragover');
					});
					dropzone.on('dragleave', function(e) {
						e.preventDefault();
						$(this).removeClass('dragover');
					});
					dropzone.on('drop', function(e) {
						e.preventDefault();
						input[0].files = e.originalEvent.dataTransfer.files;
						$(this).removeClass('dragover');
						input.change();
					});
					// Remove file
					dropzone.on('click', '.remove-file', function() {
						input[0].value = null;
						input.change();
					});
					// Check file validity, display added file
					input.change(function() {
						const modifiedCheck = form.find(`input[name=${input.attr('name')}_modified]`);
						if (modifiedCheck)
							modifiedCheck.val('true');

						// File removed
						const files = input[0].files;
						if (files.length == 0) {
							dropzone.html('');
							return;
						}
						// Number of files
						if (files.length > 1) {
							toastr.error("Only one file is expected.");
							input[0].value = null;
							return;
						}
						// Size of file
						const file = files[0];
						if (file.size > 5000000) { // 5mb
							toastr.error("File too big. 10MB maximum");
							input[0].value = null;
							return;
						}
						// Type of image files
						if (isImage === true && acceptedFormats !== null)
							if (!acceptedFormats.includes(file.type)) {
								toastr.error("File format is not accepted. Expecting "+acceptedFormats.join(', '));
								input[0].value = null;
								return;
							}

						// Selected file display
						const size = file.size < 1000 ?
							file.size + 'o' :
							file.size < 1000000 ?
							Math.floor(file.size / 1000) + 'ko' :
							Math.floor(file.size / 1000000) + 'mo';
						const fileIcon = `<div class="dropzonefile">${file.name} - ${size}&nbsp<i class="remove-file fa fa-times" style='color: red;'></i></div>`;
						dropzone.html(fileIcon)
					});
				},
				validator: (element, form) => {
					const input = element.find("input[type=file]");
					if (input.prop('required') === true && !input.val())
						return false
				}
			},
			address: {
				selector: ".address_component",
				initializer: (element) => {
				    const addressConf = {
				        url: "https://api-adresse.data.gouv.fr/search/",
				        query_parm: 'q',
				        type: 'get', // HTTP request type
				        addresses: 'features', // objet which contain list of address, if equal '.' whe take response as list,
				        address_fields: 'properties', // objet name which contain attributes or '.' ,
				        autocomplete_field: 'label', // field of properties, we use this field to select proposition. We can use ',' as separator to display in autocomplete more than one field value,
				        enable: true // If  enable, do query and get data, else data should be to set manually by user
				    };
				    const fieldsToShow = addressConf.autocomplete_field.split(',');
				    let searchResult;

				    // Uppercase address field inputs
				    element.find(".address_field").keyup(function() {
				    	$(this).val($(this).val().toUpperCase());
				    });

				    function initSearchInput(searchInput) {
				    	searchInput.autocomplete({
				    		minLength: 1,
				    		source: function (req, res) {
				                const val = searchInput.val();
				                const data = {limit: 10, [addressConf.query_parm]: val};
				                $.ajax({
				                    url: addressConf.url,
				                    type: addressConf.type,
				                    data: data,
				                    dataType: 'json',
				                    success: function (data) {
				                        searchResult = addressConf.addresses !== '.' ? data[addressConf.addresses] : data;
				                        res($.map(searchResult, function (_address) {
				                            const objet = addressConf.address_fields !== '.' ? _address[addressConf.address_fields] : _address;
				                            const toReturn = fieldsToShow.map(field => objet[field]).join(' ');
				                            return toReturn;
				                        }));
				                    }
				                });
				            },
				            select: function (e, ui) {
				                searchResult.forEach(function (_) {
				                    const _address = addressConf.address_fields !== '.' ? _[addressConf.address_fields] : _;
				                    const toReturn = fieldsToShow.map(field => _address[field]).join(' ');
				                    if (ui.item.value == toReturn) {
				                        for (var key in _address) {
				                            if (_address[key] != '') //to prevent default value replacement
				                                element.find('input[field=' + key + ']').val((_address[key] + '').toUpperCase());
				                        }
				                        /** Set Lat and Long value **/
				                        element.find('input[name=f_address_lat]').val(_.geometry.coordinates[1]);
				                        element.find('input[name=f_address_lon]').val(_.geometry.coordinates[0]);
				                        if ((!_address.street || typeof _address.street === "undefined") && _address.name)
				                            element.find("#f_address_street").val(_address.name);
				                    }
				                });
				            }
				    	});
				    }
				    // Autocomplete address search input
				    element.find(".address_search_input").each(function() {
				    	const searchInput = $(this);
				    	if (!searchInput.autocomplete) {
							$('head').append($('<link rel="stylesheet" type="text/css" />').attr('href', '/AdminLTE/plugins/jquery-ui/jquery-ui.min.css') );
				    		$.getScript('/AdminLTE/plugins/jquery-ui/jquery-ui.min.js', function() {
				    			initSearchInput(searchInput);
				    		});
				    		return;
				    	}
				    	initSearchInput(searchInput);
				    });
				    // Address info modal
				    element.find(".info_address_map").click(function(e) {
				    	e.preventDefault();
				    	$.ajax({
				    		url: '/address_settings/info_address_maps_ajax',
				    		success: data => doModal("Information", data.message),
	            			error: console.error
				    	});
				    	return false;
				    });

				    // Map initialization
				    if (element.find('.f_address_enableMaps').length && element.find('.f_address_enableMaps:eq(0)').val() === "true") {
				    	initMap(element.find('.address_map'), {
				    		lat: element.find('.f_address_lat').val(),
				    		lon: element.find('.f_address_lon').val(),
				    		navigation: element.find('.f_address_navigation').val() === "true",
				    		zoomBar: element.find('.f_address_zoomBar').val() === "true",
				    		mousePosition: element.find('.f_address_mousePosition').val() === "true"
				    	});
				    }
				}
			},
			status: {
				selector: ".status",
				initializer: (element) => {
					const url = element.data('href');
					const isInTab = element.parents('.ajax-content').length;
					element.click(function() {
						// No comment expected on status
						if (element.data('comment') != true) {
							if (isInTab) {
								// Tab status, reloadTab on success
								return $.ajax({
									url: url + '?ajax=true',
									success: NodeaTabs.reloadTab
			        			});
							}
							return location.href = url;
						}

						// Handle status comment
						const statusCommentModal = $("#statusComment");
						const statusCommentSubmit = function(event) {
			        		event.preventDefault();
			        		const comment = encodeURIComponent(statusCommentModal.find('textarea[name=comment]').summernote('code'));
			        		if (isInTab) {
				        		$.ajax({
				        			url: url + '?ajax=true&comment='+comment,
				        			success: _ => {
				        				// Close tab
				        				NodeaTabs.reloadTab();
				        				// Hide modal
				        				statusCommentModal.modal('hide');
				        				// Delete modal clone
				        				setTimeout(statusCommentModal.remove, 200);
				        			}
				        		});
				        	}
				        	else
				        		location.href = url + '?comment='+comment;

				        	// Unbind submit handler to avoid multiple bind since modal is not removed from DOM
				        	statusCommentModal.find('form').unbind('submit', statusCommentSubmit);
					        return false;
			        	}
			        	statusCommentModal.find('form').submit(statusCommentSubmit);

				        statusCommentModal.modal('show');
					});
				}
			}
		}
	};

	function initialize(context = document, overrideDefaults = {}) {
		// Get list of element merged from defaults and overrideDefaults
		const elementsList = fullElementList(overrideDefaults);
		// For each element, call default or overridden selector/initializer
		const formModifications = [], isValid = true;
		for (const element of elementsList) {
			const overrideElement = overrideDefaults.elements && overrideDefaults.elements[element];
			let {selector, initializer} = defaults.elements[element] || {};
			selector = (overrideElement && overrideElement.selector) || selector || "";
			initializer = (overrideElement && overrideElement.initializer) || initializer || (_ => {});

			// Initialize form defaults
			$(selector, context).each(function() {
				if ($(this).data('initialized') === true)
					return;

				initializer($(this));
				$(this).data('initialized', true);
			});
		}

		// Validate form before submission
		const forms = $(context).is("form") ? $(context) : $("form:not(.no-init)", context);
		if (forms.length) {
			forms.submit(function(event) {
				const handleSubmit = overrideDefaults.handleSubmit || defaults.handleSubmit;
				return handleSubmit($(this), event, overrideDefaults);
			});
		}
	}

	initialize.elements = defaults.elements;
	initialize.handleSuccess = defaults.handleSuccess;
	initialize.handleError = defaults.handleError;
	initialize.handleSubmit = defaults.handleSubmit;
	initialize.validate = defaults.validate;

	return initialize;
})();