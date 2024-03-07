let ctpQrCode = 0;
let jQueryUILoad = false;
let openLayerLoad = false;
const loadedScript = [];
let NodeaSizeFileLimit = 10000000; // Default size => 10Mb

function loadScript(scriptUrl) {
	return new Promise((res, rej) => {
		if(loadedScript.includes(scriptUrl)){
			console.warn('Script already loaded:', scriptUrl);
			return;
		}
		$.getScript(scriptUrl).done(function (script, textStatus) {
			loadedScript.push(scriptUrl);
			res();
		}).fail(function (jqxhr, settings, exception) {
			rej(exception);
		});
	});
}

function firstElementFocus(tab, idx) {
    if(!idx)
        idx = 0;
    var element = $(".form-group:eq("+idx+") label:eq(0)", tab).next().focus();
    if ((element && (element.prop('disabled') == true || element.prop('readonly') == true))
    && ($(".form-group", tab).length > 0 && idx <= $(".form-group", tab).length))
        firstElementFocus(idx+1);
}

function ajax_select(select, placeholder) {
    if (!placeholder)
        placeholder = SELECT_DEFAULT_TEXT;

    var searchField = select.data('using') && select.data('using').split(',') || 'id';
	if(Array.isArray(searchField))
		searchField = searchField.map(x => x.trim());

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
				let cleanData = $(this).data();
				// Clean useless select2 instanciation key to prevent circular recursion of the object
				// This data is not needed for server side anyway
				delete cleanData.select2;
                return JSON.stringify({
                    search: params.term,
                    page: params.page || 1,
                    searchField: searchField,
					attrData: cleanData
                });
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

const addressMapsInstance = [];
function initMap(mapElement, options) {

	let {
		lat,
		lon,
		zoomBar = true,
		mousePosition = true,
		navigation = true
	} = options;

	if (!lat || !lon)
		return console.warn("Missing latitude or longitude to init map");

	mapElement.empty();
	const mapControls = [];
	lon = parseFloat(lon);
	lat = parseFloat(lat);

	const markerSource = new ol.source.Vector();

	const markerStyle = new ol.style.Style({
		image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
			anchor: [0.5, 46],
			anchorXUnits: 'fraction',
			anchorYUnits: 'pixels',
			opacity: 0.75,
			src: '/img/address_map_marker.png'
		}))
	});

	const iconFeature = new ol.Feature({
	    geometry: new ol.geom.Point(ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857')),
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
			undefinedHTML: '&nbsp;'
		});
		mapControls.push(mousePositionControl);
	}

	const control = ol.control.defaults();

	const mapConfig = {
		controls: control.extend(mapControls),
		target: mapElement[0],
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

	const map = new ol.Map(mapConfig);
	addressMapsInstance.push(map);
	return map;
}

function initAddressSearchInput(input) {
	input.autocomplete({
		minLength: 3,
		source: function (req, res) {
			$.ajax({
				url: 'https://api-adresse.data.gouv.fr/search/',
				type: 'GET',
				data: {
					limit: 10,
					q: input.val()
				},
				dataType: 'json',
				success: data => res(data.features.map(x => {
					x.properties.coordinates = x.geometry.coordinates;
					return {
						label: x.properties.label,
						value: x.properties
					}
				}))
			});
		},
		select: function (e, ui) {
			const address = ui.item.value;
			input.val('');
			const parent = input.parents('.address_component');
			const as = parent.data('as');
			$(parent).find(`input[name="${as}.f_label"]`).val(address.label);
			$(parent).find(`input[name="${as}.f_number"]`).val(address.housenumber);
			$(parent).find(`input[name="${as}.f_street_1"]`).val(address.street);
			$(parent).find(`input[name="${as}.f_postal_code"]`).val(address.postcode);
			$(parent).find(`input[name="${as}.f_city"]`).val(address.city);
			$(parent).find(`input[name="${as}.f_country"]`).val('FRANCE');
			$(parent).find(`input[name="${as}.f_lon"]`).val(address.coordinates[0]);
			$(parent).find(`input[name="${as}.f_lat"]`).val(address.coordinates[1]);
			return false;
		}
	});
}

function rebuildAddressLabel(element) {
	const address_as = $(element).data('as');
	const f_number = $(element).find(`input[name="${address_as}.f_number"]`).val();
	const f_street_1 = $(element).find(`input[name="${address_as}.f_street_1"]`).val();
	const f_street_2 = $(element).find(`input[name="${address_as}.f_street_2"]`).val();
	const f_postal_code = $(element).find(`input[name="${address_as}.f_postal_code"]`).val();
	const f_city = $(element).find(`input[name="${address_as}.f_city"]`).val();

	let f_label = `${f_number} ${f_street_1} ${f_street_2} ${f_postal_code} ${f_city}`;
	f_label = f_label.replace(/  +/g, ' ');
	$(element).find(`input[name="${address_as}.f_label"]`).val(f_label)
}

function humanReadableFileSize(size) {
	const baseSize = 1000 // Or 1024
    let i = Math.floor( Math.log(size) / Math.log(baseSize) );
    return (size / Math.pow(baseSize, i)).toFixed(2) * 1 + ['o', 'Ko', 'Mo', 'Go', 'To'][i];
};

function getValidMessage(context, selector){
	return context.parent().siblings(selector)[0];
}

let NodeaForms = (_ => {
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
							// Necessary to push empty value in update, without it set the value to null in update is impossible
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
						checkboxes.slice(i, i + 3).wrapAll("<div class='col-3' style='margin-bottom: 15px;'></div>");
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
					element.text(HtmlDecode(element.text()));
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
					let decimalRegx = new RegExp("^-?[0-9]+([\.\,][0-9]*)?$");
					if(element.data('precision')) {
						let precision = element.data('precision').split(',')[0];
						const round = element.data('precision').split(',')[1] ? element.data('precision').split(',')[1] : 0;
						precision = parseInt(precision) - parseInt(round);
						// Precision is total number of digit (including after comma)
						// Round is number of digit after the comma
						// So the precision before the comma is precision - round
						decimalRegx = new RegExp("^-?[0-9]{1,"+precision+"}([\.\,][0-9]{0,"+round+"})?$");
					}
					element.on('keyup', function() {
						while ($(this).val() != "" && $(this).val() != "-" && !decimalRegx.test($(this).val()))
							$(this).val($(this).val().substring(0, $(this).val().length - 1));
						$(this).val($(this).val().replace(',', '.'));
					});
				}
			},
			currency: {
				selector: "input[data-type='currency']",
				initializer: (element) => {
					let decimalRegx = new RegExp("^-?[0-9]+([\.\,][0-9]*)?$");
					if(element.data('precision')) {
						let precision = element.data('precision').split(',')[0];
						const round = element.data('precision').split(',')[1] ? element.data('precision').split(',')[1] : 0;
						precision = parseInt(precision) - parseInt(round);
						// Precision is total number of digit (including after comma)
						// Round is number of digit after the comma
						// So the precision before the comma is precision - round
						decimalRegx = new RegExp("^-?[0-9]{1,"+precision+"}([\.\,][0-9]{0,"+round+"})?$");
					}
					element.on('keyup', function() {
						while ($(this).val() != "" && $(this).val() != "-" && !decimalRegx.test($(this).val()))
							$(this).val($(this).val().substring(0, $(this).val().length - 1));
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
						if(!element.parent().parent().find('.field-mail-error').length){
							element.css("border", "1px solid red").parent().after("<span class='field-mail-error' style='color: red;'>Le champ est incomplet.</span>");
						}
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
			phone_indic: {
				selector: "input[type='tel_indic']",
				initializer: (element) => {
					let selectedCountries = [];
					if (element.hasClass('national')) {
						selectedCountries.push('fr', 'pf', 'gf', 'gp', 'gy', 'mq', 're', 'bl', 'pm', 'yt', 'mf', 'wf', 'nc')
					}
					/* Input type tel - Use module intl-tel-input */
					$(element).each(function () {
						let iti = window.intlTelInput(this, {
							initialCountry: 'fr',
							nationalMode: false,
							autoHideDialCode: true,
							utilsScript: '/js/intlTelInput-utils.js',
							separateDialCode: true,
							onlyCountries: selectedCountries
						});
						$(`input[name=indicatif_${element[0].name}]`).val(`+${iti.selectedCountryData.dialCode}`)

						/* Code for validation tel number */
						const that = $(this);

						// here, the index maps to the error code returned from getValidationError - see readme
						let errorMap = ["Numéro invalide", "Code pays invalide", "Trop court", "Trop long", "Numéro invalide"];

						let reset = function () {
							if (this.classList) {
								this.classList.remove("error");
							}
							if (getValidMessage(that, ".error-msg")) {
								getValidMessage(that, ".error-msg").innerHTML = "";
								getValidMessage(that, ".error-msg").classList.add("hide");
								getValidMessage(that, ".valid-msg").classList.add("hide");
							}
						};

						// on blur: validate
						this.addEventListener('blur', function () {
							reset();
							if (this.value.trim()) {
								if (iti.isValidNumber()) {
									getValidMessage(that, ".valid-msg").classList.remove("hide");
								} else {
									this.classList.add("error");
									let errorCode = iti.getValidationError();
									if (getValidMessage(that, ".error-msg")) {
										errorCode = errorCode === -99 ? 0 : errorCode;
										getValidMessage(that, ".error-msg").innerHTML = errorMap[errorCode];
										getValidMessage(that, ".error-msg").classList.remove("hide");
									}
								}
								$(`input[name=indicatif_${element[0].name}]`).val(`+${iti.selectedCountryData.dialCode}`)
							}
						});

						// on keyup / change flag: reset
						this.addEventListener('change', reset);
						this.addEventListener('keyup', reset);
					});
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
						toolbarPlacement: 'bottom',
						showClear: true,
						icons: {
							clear: 'fas fa-trash'
						},
						format: 'HH:mm',
						defaultDate: moment().format(TIMEPICKER_FORMAT)
					});
				}
			},
			datepicker: {
				selector: '.datepicker',
				initializer: (element) => {
					let pickerOpts = {};
					let mask;
					if (lang_user == 'fr-FR') {
						pickerOpts = {
							format: "DD/MM/YYYY",
							useCurrent: false // Disable filling date on opening picker
						};
						mask = {
							inputFormat: "dd/mm/yyyy",
							alias: 'datetime',
							placeholder: "jj/mm/aaaa"
						};
					} else {
						pickerOpts = {
							format: "YYYY-MM-DD",
							useCurrent: false
						};
						mask = {
							inputFormat: "yyyy-mm-dd",
							alias: 'datetime',
							placeholder: "yyyy-mm-dd"
						};
					}

					// Init
					element.datetimepicker({
						...pickerOpts,
						toolbarPlacement: 'bottom',
						showClear: true,
						icons: {
							clear: 'fas fa-trash'
						}
					});
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
					let pickerOpts = {};
					let mask;
					if (lang_user == 'fr-FR') {
						pickerOpts = {
							format: "DD/MM/YYYY HH:mm",
							sideBySide: true
						};
					} else {
						pickerOpts = {
							format: "YYYY-MM-DD HH:mm",
							sideBySide: true
						};
					}

					// Init
					element.datetimepicker({
						...pickerOpts,
						toolbarPlacement: 'bottom',
						showClear: true,
						icons: {
							clear: 'fas fa-trash'
						}
					});

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
								console.error('BARCODE ERROR:', id, barcodeType, e);
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
						if (file.size > NodeaSizeFileLimit) {
							toastr.error(`File too big. ${humanReadableFileSize(NodeaSizeFileLimit)} maximum`);
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
						const fileIcon = `<div class="dropzonefile">${file.name} - ${humanReadableFileSize(file.size)}&nbsp<i class="remove-file fa fa-times" style='color: red;'></i></div>`;
						dropzone.html(fileIcon)
					});
				},
				validator: (element, form) => {
					const input = element.parent().find("input[type=file]");
					const label = element.parent().find("label[for='"+input.attr('name')+"']");
					const hasDropzoneFile = element.find('.dropzonefile').length == 1;
					// For update form we cannot set required the type file input (cannot prefilled input file for security reasons)
					// So we check only the required class on label instead
					if ((input.prop('required') === true || label.hasClass('required')) && !input.val() && !hasDropzoneFile){
						toastr.error(locales.global_component.local_file_storage.required_file);
						return false;
					}
				}
			},
			address_form: {
				selector: ".address_component",
				initializer: (element) => {

					// Init search input autocompletion
					if(!jQueryUILoad) {
						$('head').append($('<link rel="stylesheet" type="text/css" />').attr('href', '/AdminLTE/plugins/jquery-ui/jquery-ui.min.css') );
						jQueryUILoad = loadScript('/AdminLTE/plugins/jquery-ui/jquery-ui.min.js').catch(err => {
							console.error(err);
						})
					}
					jQueryUILoad.then(_ => initAddressSearchInput(element.find('.address_search_input')));

					element.find('input').each(function() {
						$(this).on('keyup', function() {
							rebuildAddressLabel(element);
						})
					});

					// Map initialization
					if(element.find('.address_component_map').length != 0) {
						if(!openLayerLoad) {
							openLayerLoad = loadScript('/js/plugins/ol/ol.js').catch(err => {
								console.error(err);
							})
						}
						openLayerLoad.then(_ => initMap(element.find('.address_component_map'), {
							lat: element.find('input[name="f_lat"]').val(),
							lon: element.find('input[name="f_lon"]').val()
						}));
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
						if (element.data('comment') != true && element.data('reason') != true ) {
							if (isInTab) {
								// Tab status, reloadTab on success
								return $.ajax({
									url: url + '?ajax=true',
									success: NodeaTabs.reloadTab
			        			});
							}
							return location.href = url;
						}

						// Handle Modal status comment or reason select
						const statusCommentModal = $("#statusComment");
						
						const statusCommentSubmit = function(event) {
			        		event.preventDefault();
			        		const comment = encodeURIComponent(statusCommentModal.find('textarea[name=comment]').summernote('code'));
							const reasonID = parseInt(statusCommentModal.find('input[name=r_reason]').val());
							var uri = "&";
							if (comment)
								uri += "comment="+comment;
							if (reasonID)
								uri += "reasonID="+reasonID;
			        		if (isInTab) {
				        		$.ajax({
				        			url: url + '?ajax=true'+uri,
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
				        		location.href = url + '?' + uri;

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

	function mergeElements(overrideDefaults = {}) {
		const elementsList = Object.entries({...defaults.elements, ...overrideDefaults.elements}).map(([key]) => key);
		const mergedElements = {};
		for (const element of elementsList) {
			mergedElements[element] = {
				selector: "", initializer: _ => {}, validator: _ => {},
				...defaults.elements[element],
				...overrideDefaults && overrideDefaults.elements && overrideDefaults.elements[element]
			};
		}
		return mergedElements;
	}

	// Handle form submission
	function handleSubmit(form, event, overrideDefaults = {}) {
        // Prevent multiple submission (double click)
        if (form.data('submitting') === true) {
            event.preventDefault();event.stopPropagation();
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
			if (typeof error.responseText === "string")
				return toastr.error(error.responseText);

			var errorObj = JSON.parse(error.responseText);
			if (errorObj.refresh)
				return location.reload();
			if (errorObj instanceof Array) {
				for (var i = 0; i < errorObj.length; i++)
					toastr[errorObj[i].level](errorObj[i].message);
			} else
				toastr.error(error.responseText);
		} catch (e) {
			console.error(error, par2, par3);
			return toastr.error(ERROR_MSG)
		}
	}

	function validate(form, overrideDefaults = {}) {
		let isValid = true;
		const formModifications = [];
		// Get list of element merged from defaults and overrideDefaults
		const mergedElements = mergeElements(overrideDefaults);

		// For each element, call validator
		for (const element in mergedElements) {
			const {selector, initializer, validator} = mergedElements[element];
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

	function initialize(context = document, overrideDefaults = {}) {
		// Get list of element merged from defaults and overrideDefaults
		const mergedElements = mergeElements(overrideDefaults);
		// For each element, call default or overridden selector/initializer
		const formModifications = [], isValid = true;
		for (const element in mergedElements) {
			let {selector, initializer} = mergedElements[element];
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