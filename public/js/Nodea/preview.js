$(function() {

	function getTranslation(key, params) {
		return new Promise(resolve => {
			$.ajax({
				url: '/default/ajaxtranslate',
				type: 'POST',
				data: {
					key: key,
					params: params,
					lang: user_lang
				},
				success: function(answer) {
					resolve(answer.value);
				},
				error: function(error) {
					console.error(error);
					resolve(key);
				}
			});
		});
	}

	$(document).on('dblclick', '#chat-box .mipsy-img', function(){
		if($('#preview .row .col-12').length == 0){
			$('#preview .row .col-xs-12').addClass('col-12').removeClass('col-xs-12 col-md-8 col-lg-9 col-md-4 col-lg-3');
		} else {
			$('#preview .row .col-12').eq(0).addClass('col-xs-12 col-md-8 col-lg-9').removeClass('col-12');
			$('#preview .row .col-12').eq(0).addClass('col-xs-12 col-md-4 col-lg-3').removeClass('col-12');
		}
	});

	////////////
	// UI Editor
	////////////
	$(document).on('click', '.ge-add-row', function() {
		var newRow = $(this).parent().parent().children(".row .ui-sortable").last();
		newRow.find('.ui-sortable').remove();
		$(".ge-add-column").remove();
	});

	$(document).on('click', '.ge-addRowGroup', function() {
		var newRow = $("body").find('.ui-sortable').last().parent();
		newRow.find('.ge-add-row').trigger('click');
		newRow.find('.ge-content').remove();
	});

	$("#entitySelect").select2({
		width: '100%'
	});

	$("#entitySelect").on('change', function() {
		$("#pages").slideUp();
		if ($(this).val()) {
			$("#pages a").data('entity', $(this).val());
			$("#pages").slideDown();
		}
	});

	var entity, page;
	$(".ui_editor_page").on('click', function() {
		var self = this;
		entity = $(this).data('entity');
		page = $(this).data('page');
		$.ajax({
			url: '/ui_editor/getPage/' + entity + '/' + page,
			success: function(pageHtml) {
				console.log(pageHtml);
				$("#ui_editor").html(pageHtml);
				// Remove mainControls who are not removed by modifying html
				$(".ge-mainControls").remove();

				// Enable gridEditor
				$("#ui_editor").gridEditor();
				$("#ui_editor_save").show();
				$("#ui_editor_tips").show();
				$("#ui_editor_apply_all").show();
				$("#ui_editor_apply_all_span").show();
				$(".ui_editor_page").parents('li').removeClass('active');
				$(self).parents('li').addClass('active');
			},
			error: function(err) {
				console.error(err);
				toastr.error(err.responseText);
			}
		});
	});

	$("#ui_editor_save").on('click', function() {
		var html = $("#ui_editor").gridEditor('getHtml');
		var currentScreenMode = $(".ge-layout-mode button span").text();
		$(this).text(loadingButtonText);
		$(this).prop("disabled", true);
		$.ajax({
			url: '/ui_editor/setPage/' + entity + '/' + page,
			method: 'post',
			data: {
				html: html,
				screenMode: currentScreenMode,
				applyAll: $("#ui_editor_apply_all").prop("checked")
			},
			context: this,
			success: function(msg) {
				$("#ui_editor_apply_all").prop("checked", false);
				toastr.success(msg);
				$(this).text(savingButtonText);
				$(this).prop("disabled", false);
			},
			error: function(err) {
				console.error(err);
				toastr.error(err.responseText);
			}
		});
	});

	/////////
	// Editor
	/////////
	// Load file/folder sidebar
	function generateSidebarEditor(menu, tabMargin = 0, content = "") {
		for (var i = 0; i < menu.length; i++) {
			if (typeof menu[i].path !== "undefined") {
				content += "" +
					"<li class='nav-item has-treeview'>" +
					"   <a class='load-file nav-link' href='#' data-path=" + menu[i].path + " data-filename=" + menu[i].title + " style='margin-left: " + tabMargin + "px'>" +
					"       <i class='fa fa-file'></i>" +
					"       &nbsp;&nbsp;" + menu[i].title +
					"   </a>" +
					"</li>";
			} else if (typeof menu[i].under !== "undefined") {
				content += "" +
					"<li class='nav-item has-treeview'>" +
					"    <a href='#' class='nav-link' style='margin-left: " + tabMargin + "px'>" +
					"        <i class='fa fa-folder'></i>&nbsp;&nbsp;" +
					"        <span>" + menu[i].title + "</span>&nbsp;&nbsp;" +
					"        <i class='fas fa-angle-left right'></i>" +
					"    </a>" +
					"    <ul class='nav nav-treeview'>";
				var newMargin = tabMargin + 15;
				content = generateSidebarEditor(menu[i].under, newMargin, content);
				content += "" +
					"    </ul>" +
					"</li>";
			}
		}
		return content;
	}

	var isEditorStarted = false;
	$(document).on("click", "#start-editor", function() {
		if (!isEditorStarted) {
			// Tabs display/animation need to be completely finished to instanciate the editor
			setTimeout(function() {
				$("body").append("<script src='/js/plugins/codemirror/codemirror.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/multiplex.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/simple.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/search.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/searchcursor.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/dialog.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/matchbrackets.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/closebrackets.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/foldcode.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/foldgutter.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/brace-fold.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/xml-fold.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/indent-fold.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/markdown-fold.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/comment-fold.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/trailingspace.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/closetag.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/overlay.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/fullscreen.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/simplescrollbars.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/addon/formatting.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/keymap/sublime.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/mode/xml/xml.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/mode/css/css.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/mode/javascript/javascript.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/mode/htmlmixed/htmlmixed.js' type='text/javascript'></script>" +
					"<script src='/js/plugins/codemirror/mode/sql/sql.js' type='text/javascript'></script>" +
					"<script type='text/javascript' src='/js/Nodea/code_editor.js'></script>");
				isEditorStarted = true;
				// Load treeview js for side menu
				// $("#codemirror-menu ul#editor-menu").tree();
				$("#loadingEditorIframe").remove();
			}, 500);

			var side_menu_html = generateSidebarEditor(workspaceFolder);
			$("#codemirror-menu ul#editor-menu").append(side_menu_html);
		}
	});

	/////////
	// Set Logo
	/////////
	dropzoneSetLogo.on("complete", function(file, response) {
		$("form#previewForm").submit();
	});

	$(document).on("click", "#addLogo", function() {
		dropzoneSetLogo.processQueue();
	});

	$('#modalsetlogo').on('hidden.bs.modal', function() {
		$("input[name='set_logo']").val("");
		dropzoneSetLogo.removeAllFiles(true);
	});

	/////////
	// Input instruction
	/////////
	var reg = new RegExp(/[^a-zA-Z0-9àâçéèêëîïôûùüÿñ_\-\,\ \'\!]/);
	var instructionHistory = JSON.parse(localStorage.getItem("nodea_given_instruction_history_" + appName));
	var indexInstructionSelected = instructionHistory !== null ? instructionHistory.length : 0;
	$("input#instruction").css("transition", "color 0.2s");

	$(document).on("keydown", "input#instruction", function(e) {
		if (instructionHistory != null) {
			/* UP ARROW */
			if (e.ctrlKey) {
				if (e.which == "38") {
					$("input#instruction").css("color", "rgba(255,255,255,0)");
					if (--indexInstructionSelected < 0)
						indexInstructionSelected = 0;
					setTimeout(function() {
						$("input#instruction").val(instructionHistory[indexInstructionSelected])
					}, 200);
					setTimeout(function() {
						$("input#instruction").css("color", "#555")
					}, 300);
				}
				/* DOWN ARROW */
				else if (e.which == "40") {
					$("input#instruction").css("color", "rgba(255,255,255,0)");
					if (++indexInstructionSelected > instructionHistory.length - 1) {
						indexInstructionSelected = instructionHistory.length;
						$("input#instruction").val("");
					} else {
						setTimeout(function() {
							$("input#instruction").val(instructionHistory[indexInstructionSelected])
						}, 200);
					}
					setTimeout(function() {
						$("input#instruction").css("color", "#555")
					}, 300);
				}
			}
		}
	});

	// Nb instructions that will popup modal demo
	const demo_popup_instruction_nb = [3, 9, 15, 20];
	$(document).on("submit", "form#previewForm", async(e) => {
		e.preventDefault();

		if ($("#instruction").val() == "") {
			toastr.error(await getTranslation('preview.empty_instruction'));
			return false;
		}

		// File is currently modified in code editor and not save
		if($("#codemirror-editor li.load-file.modified").length != 0)
			if(!confirm(await getTranslation('preview.modified_file_instruction')))
				return false;

		var setLogoInstructions = ["add logo", "add a logo", "set a logo", "set logo", "mettre un logo", "mettre logo", "ajouter logo", "ajouter un logo"];
		var givenInstruction = $("#instruction").val().toLowerCase().trim();
		var logoFileName = $("input[name='set_logo']").val();
		if (setLogoInstructions.indexOf(givenInstruction) != -1 && logoFileName == "") {
			// Ask to add a logo
			$('#modalsetlogo').modal();
			return false;
		} else if (setLogoInstructions.indexOf(givenInstruction) != -1 && logoFileName != "") {
			// Logo already given, now do the instruction and add the logo name in the form
			$("#instruction").val($("#instruction").val() + " " + logoFileName);
			$('#modalsetlogo').modal("toggle");
			$("input[name='set_logo']").val("");
			dropzoneSetLogo.removeAllFiles(true);
		}

		if ($("#instruction").val() != "restart server") {
			if (instructionHistory == null)
				instructionHistory = [];
			instructionHistory.push($("#instruction").val());
			localStorage.setItem("nodea_given_instruction_history_" + appName, JSON.stringify(instructionHistory));
		}

		$("#execute_instruction").html("Loading...");
		$("#execute_instruction").prop("disabled", true);
		$("#loadingIframe").show();

		$.ajax({
			url: "/application/preview",
			method: 'POST',
			data: {
				iframe_url: $(this).find('input[name="iframe_url"]').val(),
				chat: $(this).find('input[name="chat"]').val(),
				instruction: $(this).find('input[name="instruction"]').val()
			},
			success: function(data) {

				if(nodea_demo_mode && data.nb_instruction && demo_popup_instruction_nb.includes(data.nb_instruction)){
					$("#demo_instructions_modal").find('#nb_instructions_count_modal').html(data.nb_instruction);
					$("#demo_instructions_modal").modal();
				}

				$("#errorIframe").hide();
				$('iframe#iframe').show();

				if (data.toRedirect)
					return window.location.href = data.url;

				setTimeout(function() {
					$("#loadingIframe").hide();
				}, 300);

				// Update session screen
				if (typeof data.session.application.name !== "undefined" && data.session.application.name != null)
					$(".sessionApplicationInfo").text(" " + data.session.application.name);
				else
					$(".sessionApplicationInfo").text(" " + data.session.application.noApplication);
				if (typeof data.session.module.name !== "undefined" && data.session.module.name != null)
					$(".sessionModuleInfo").text(" " + data.session.module.name);
				else
					$(".sessionModuleInfo").text(" " + data.session.module.noModule);
				if (typeof data.session.entity.name !== "undefined" && data.session.entity.name != null)
					$(".sessionEntityInfo").text(" " + data.session.entity.name);
				else
					$(".sessionEntityInfo").text(" " + data.session.entity.noEntity);

				// Keep instructionHistory up to date
				instructionHistory = JSON.parse(localStorage.getItem("nodea_given_instruction_history_" + appName));
				indexInstructionSelected = instructionHistory !== null ? instructionHistory.length : 0;
				// User instruction
				var userItem = data.chat.items[data.chat.items.length - 2];
				if (userItem.user != 'Nodea')
					$("#chat-box").append(`<div><div class="timeline-item user-item"><span class="time"><i class="fas fa-clock"></i>&nbsp;${userItem.dateEmission}</span><h3 class="timeline-header">${userItem.user}</h3><div class="timeline-body user-answer"><span class="standard-writing">${userItem.content}</span></div></div><i class="fas fa-user bg-primary"></i></div>`);

				// Nodea answer
				var mipsyItem = data.chat.items[data.chat.items.length - 1];
				getTranslation(mipsyItem.content, mipsyItem.params).then(mipsyAnswer => {
					let contentMipsy = `<div><img src="/img/mascot/head.png" alt="Nodea picture" class="mipsy-img"><div class="timeline-item mipsy-item"><span class="time"><i class="fas fa-clock"></i>&nbsp;${mipsyItem.dateEmission}</span><h3 class="timeline-header">${mipsyItem.user}</h3><div class="timeline-body mipsy-answer"><span class="standard-writing">${mipsyAnswer}</span></div></div></div>`;
					if (mipsyItem.isError)
						contentMipsy = `<div><img src="/img/mascot/head.png" alt="Nodea picture" class="mipsy-img"><div class="timeline-item mipsy-item"><span class="time"><i class="fas fa-clock"></i>&nbsp;${mipsyItem.dateEmission}</span><h3 class="timeline-header">${mipsyItem.user}</h3><div class="timeline-body mipsy-answer"><span class="standard-writing" style="color:#e33939;"><i class='fa fa-exclamation-circle'></i>&nbsp;${mipsyAnswer}</span></div></div></div>`;
					$("#chat-box").append(contentMipsy);

					$("#instruction").val("");
					$("#instruction").blur().focus();
					$("#execute_instruction").html("Executer");
					$("#execute_instruction").prop("disabled", false);

					var bottomCoord = $('#chat-box')[0].scrollHeight;
					$('#chat-box').slimScroll({
						scrollTo: bottomCoord
					});

					// Error
					if (data.iframe_url == -1) {
						$("#loadingIframe").hide();
						$("#errorIframe").show();
						return;
					}

					// Reload iframe
					var iframe = document.getElementById("iframe");
					iframe.src = data.iframe_url;
					$("#errorIframe").hide();

					// Update UI Editor selector with new entities
					var defaultUISelectorText = $("#entitySelect option")[0].text;
					$("#entitySelect").empty();
					$("#entitySelect").append("<option default value=''>" + defaultUISelectorText + "</option>");
					for (var i = 0; i < data.entities.length; i++)
						$("#entitySelect").append("<option value='" + data.entities[i]._name + "'>" + data.entities[i]._displayName + "</option>");

					// Update Editor file selection
					var content = generateSidebarEditor(data.workspaceFolder);
					$("#codemirror-menu ul#editor-menu").empty().append(content);

					// Refresh Code Editor Tabs
					if (typeof myEditor !== "undefined") {
						$("#codemirror-editor li.load-file").each(function() {
							$(this).trigger('click', true).removeClass("modified");
						});
					}

					// Reset UI Editor
					$("#pages").slideUp();
					entity = null;
					page = null;
					$("#ui_editor").html("");
					// Enable gridEditor
					$("#ui_editor").gridEditor();
					// Remove mainControls who are not removed by modifying html
					$(".ge-mainControls").remove();
					$("#ui_editor_save").hide();
					$("#ui_editor_tips").hide();
					$("#ui_editor_apply_all").hide();
					$("#ui_editor_apply_all_span").hide();
				});
			},
			error: function(error) {
				console.error(error);
				toastr.error(error.message);
			}
		});
		return false;
	});

	$(document).on("click", "#restart-server", function(e) {
		$("#instruction").val("restart server");
		$("form#previewForm").trigger('submit');
	});

	$(document).on("click", "#save-server", function(e) {
		$("#instruction").val("save");
		$("form#previewForm").trigger('submit');
	});

	/////////
	// Autocomplete
	/////////
	$("#instruction").autocomplete({
		autoFocus: true,
		delay: 200,
		source: function(request, response) {
			$.getJSON('/default/completion', {
				app_name: appName,
				str: request.term
			}, response);
		},
		search: function() {
			/* !important! Fix google chrome lag/crach issues */
			$(this).data("ui-autocomplete").menu.bindings = $();
			return true;
		},
		focus: function() {
			// prevent value inserted on focus
			return false;
		},
		select: function(event, ui) {

			var ENTERKEY = 13;
			if (event.keyCode != ENTERKEY) {
				var completeVal = ui.item.value;
				// If complete value have already typed string in it, dont concat with current value
				if (completeVal.indexOf(this.value) == 0) {
					this.value = completeVal;
					for(const value of ['variable', 'type', 'widget', 'entity', 'module'])
						this.value = this.value.split(`[${value}]`).join("").trim();
				} else {
					// Remove the last word of already typed instruction because it is also in the completed value
					var parts = this.value.split(' ');
					if (parts[parts.length - 1] == " ")
						parts.pop();
					else {
						compareNum = 0;
						l = Math.min(completeVal.length, parts[parts.length - 1].length);
						for (i = 0; i < l; i++) {
							if (completeVal.charAt(i).toLowerCase() == parts[parts.length - 1].charAt(i).toLowerCase()) compareNum++;
						}
						if (compareNum <= completeVal.length && completeVal.substring(0, compareNum).toLowerCase() == parts[parts.length - 1].toLowerCase())
							parts.pop();
					}
					this.value = parts.join(' ') + ' ' + completeVal;
					for(const value of ['variable', 'type', 'widget', 'entity', 'module'])
						this.value = this.value.split(`[${value}]`).join("").trim();
				}

				var TABKEY = 9;
				if (event.keyCode == TABKEY) {
					event.preventDefault();
					this.value = this.value + " ";
					$('#instruction').focus();
				}
				return false;
			} else {
				event.preventDefault();
				$('#execute_instruction').click();
				return false;
			}
		}
	});

	/////////
	// Logs
	/////////
	var flagBottom = true;
	var flagStopReload = false;
	var logsInitialized = false;
	var logsInterval;
	var logsContainer = $("#logs-content");

	function updateLog() {
		if ($('#logs-content').is(":visible") && !$('#disabled_refresh_logs').prop('checked')) {
			$.ajax({
				url: '/default/update_logs',
				method: "POST",
				data: {
					appName: appName
				},
				success: function(data) {
					$("#logs-content").html(data);
					if (flagBottom) {
						logsContainer.slimScroll({
							scrollTo: logsContainer[0].scrollHeight
						});
					}

					logsInterval = window.setTimeout(updateLog, 1000);
				},
				error: function(err) {
					console.error(err);
				}
			});
		} else {
			logsInterval = window.setTimeout(updateLog, 1000);
		}
	}

	$(document).on("click", "#start-logs", function() {
		if (!logsInitialized) {
			logsInitialized = true;
			setTimeout(function() {
				updateLog();
			}, 1000);

			$('#logs-content').slimScroll({
				start: "bottom",
				height: "700px",
				railVisible: true,
				alwaysVisible: true,
				color: '#FFF',
				size: '10px'
			}).bind('slimscrolling', function(e, pos) {
				if ($(this)[0].scrollHeight - pos <= 1000) {
					flagBottom = true;
				} else {
					flagBottom = false;
				}
			});
		}
	});
})