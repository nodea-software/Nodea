/*!
 * Nodea v3.1
 * Copyright 2016
 * Licensed under GPLV3.0 https://www.gnu.org/licenses/gpl.html
 */

/* Simple app generation */
$(function() {
	let pourcentInterval;
	function getPourcent(){
		$.ajax({
			url : '/build/get_pourcent_generation',
			type : 'GET',
			dataType : 'json',
			contentType: "application/json",
			success: function (data) {
				if(!isNaN(data.pourcent)){
					$("#app-progress-bar").find(".progress-bar").attr("aria-valuenow", data.pourcent);
					$("#app-progress-bar").find(".progress-bar").css("width", data.pourcent + "%");
					$("#app-progress-bar").find(".progress-bar").text(data.pourcent + "%");

					if(data.pourcent >= 99)
						clearInterval(pourcentInterval);
				}
			},
			error: function (error) {
				console.error(error);
			}
		});
	}

	function checkStartGeneration(app_name, first_call = false) {
		$.ajax({
			url : `/build/get_generation_queue?app=${app_name}&first=${first_call}`,
			type : 'GET',
			success: function (data) {
				if(data.cpt == -1) {
					$('#generate-button').css("display", "block");
					return toastr.error("Une application avec le même nom est déjà en cours de génération");
				}
				$('#generate-button').prop("disabled", true);
				$('#generate-button').css("display", "none");
				if(data.cpt > 1){
					$('input[name="application"]').hide();
					if($('span#queue_text_span').length == 0)
						$('input[name="application"]').after('<br><span id="queue_text_span"></span>');
					const new_text = QUEUE_TEXT.replace('%cpt', '<b>'+data.cpt+'</b>');
					setTimeout(_ => {
						checkStartGeneration(app_name);
					}, 5000);
					return $('span#queue_text_span').html(new_text)
				}

				$('#queue_text_span').hide();
				$('form[action="/build/application"]').trigger('submit');
				$("#app-progress-bar").css("display", "block");
				pourcentInterval = setInterval(getPourcent, 1000);
			},
			error: function (error) {
				console.error(error);
				toastr.error(error);
				$('#generate-button').css("display", "block");
			}
		});
	}

	$(document).on("click", "#generate-button", function(){
		queueInterval = null;

		$('#generate-button').css("display", "none");
		const app_name = $('input[name="application"]').val();

		if(!app_name || app_name == '')
			return toastr.warning('Merci de renseigner un nom d\'application');

		checkStartGeneration(app_name, true);
	});

	$(document).on("keyup", 'input[name="application"]', function(e){

		var string = $(this).val();
		string = string.replace(/é/g, "e");
		string = string.replace(/\./g, "");
		string = string.replace(/\ /g, "-");
		string = string.replace(/è/g, "e");
		string = string.replace(/ê/g, "e");
		string = string.replace(/ë/g, "e");
		string = string.replace(/\ê/g, "e");
		string = string.replace(/à/g, "a");
		string = string.replace(/â/g, "a");
		string = string.replace(/ä/g, "a");
		string = string.replace(/ô/g, "o");
		string = string.replace(/ö/g, "o");
		string = string.replace(/û/g, "u");
		string = string.replace(/ù/g, "u");
		string = string.replace(/ü/g, "u");
		string = string.replace(/î/g, "i");
		string = string.replace(/ï/g, "i");
		string = string.replace(/ç/g, "c");
		string = string.replace(/\Ù/g, "u");
		string = string.replace(/\Û/g, "u");
		string = string.replace(/\Ü/g, "u");
		string = string.replace(/\À/g, "a");
		string = string.replace(/\Â/g, "a");
		string = string.replace(/\Ä/g, "a");
		string = string.replace(/\Ç/g, "c");
		string = string.replace(/\È/g, "e");
		string = string.replace(/\É/g, "e");
		string = string.replace(/\Ê/g, "e");
		string = string.replace(/\Ë/g, "e");

		if (!/^(?![0-9]+$)(?!.*-$)(?!.+-{2,}.+)(?!-)[a-zA-Z0-9- ]{1,25}$/g.test(string)) {

			if(string == ""){
				$("span.applicationSpanUrl").remove();
				return;
			}

			var errorText = "Le nom d'application doit respecter les règles suivantes :<br>";
			errorText += "<ul>";
			errorText += "<li>- Caractères alphanumériques uniquement.</li>";
			errorText += "<li>- Au moins une lettre.</li>";
			errorText += "<li>- Un espace maximum entre chaque mot.</li>";
			errorText += "<li>- Aucun espace en début ou fin.</li>";
			errorText += "<li>- 25 caractères maximum.</li>";
			errorText += "<li>- Pas de tiret (-) en début ou fin, ni deux ou plus à la suite(--).</li>";
			errorText += "</ul>";

			$("span.applicationSpanUrl").remove();
			if ($("span.applicationSpan").length == 0){
				$(this).after("<span class='applicationSpan' style='color:red;'><i class='fa fa-exclamation-circle'></i> "+errorText+"</span>");
			}
			$("#generate-button").prop('disabled', true);
		} else {
			$("span.applicationSpan").remove();
			$("span.applicationSpanUrl").remove();
			$("#generate-button").prop('disabled', false);

			/* If online environment */
			if(dns_studio != "") {
				string = env_protocol + "://" + env_sub_domain + "-" + string + "." + dns_studio;
				$(this).after("<p><span class='applicationSpanUrl' style='margin-bottom:10px'><i style='color: orange;' class='fa fa-info-circle'></i> L'url de votre application sera: <b>"+string.toLowerCase()+"</b></span></p>");
			}
		}
	});
});