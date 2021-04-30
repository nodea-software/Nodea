$(function() {

	/* Loading generation */
	$(document).on("click", ".generate-button", function(){

		if($(".applicationInput").val() == '')
			return toastr.warning('Merci de renseigner un nom d\'application');

		$(this).parents('form').submit();

		$(this).prop("disabled", true);
		var pourcent = 0;

		$("#app-progress-bar").css("display", "block");
		$(this).css("display", "none");

		function getPourcent(){
			$.ajax({
				url : '/application/get_pourcent_generation',
				type : 'GET',
				dataType : 'json',
				contentType: "application/json",
				success: function (data) {
					if(!isNaN(data.pourcent)){
						$("#app-progress-bar").find(".progress-bar").attr("aria-valuenow", data.pourcent);
						$("#app-progress-bar").find(".progress-bar").css("width", data.pourcent + "%");
						$("#app-progress-bar").find(".progress-bar").text(data.pourcent + "%");

						if(data.pourcent == 99)
							clearInterval(pourcentInterval);
					}
				},
				error: function (error) {
					console.error(error);
				}
			});
		}

		var pourcentInterval = setInterval(getPourcent, 1000);
	});

	$(document).on("keyup", "#application", function(e){

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
			$("#step2Discover2, #step2Discover1").prop('disabled', true);
		} else {
			$("span.applicationSpan").remove();
			$("span.applicationSpanUrl").remove();
			$("#step2Discover2, #step2Discover1").prop('disabled', false);

			/* If online environment */
			if(dns_studio != "") {
				string = env_protocol + "://" + env_sub_domain + "-" + string + "." + dns_studio;
				$(this).after("<p><span class='applicationSpanUrl' style='margin-bottom:10px'><i style='color: orange;' class='fa fa-info-circle'></i> L'url de votre application sera: <b>"+string.toLowerCase()+"</b></span></p>");
			}
		}
	});

	/* --------------- Initialisation des select --------------- */
	$("select").select2();

	$(document).on("change", "select[name='select_application']", function() {
		$("#btn-preview").attr("href", "/application/preview/" + $(this).val());
	});

	/* Trigger to update href preview btn */
	$("select[name='select_application']").trigger('change');

	$(document).on("click", "#create_new_application", function(){
		$(".applicationInput").prop('required', true);
		$("span.applicationSpan").remove();
		$("span.applicationSpanUrl").remove();
		$(this).parents(".form-group").slideUp();
		$("#create_new_application_input").slideDown();
		$(".applicationInput").val("").focus();
	});

	$(document).on("click", "#select_existing_application", function(){
		$(".applicationInput").prop('required', false);
		$(this).parents(".form-group").slideUp();
		$("#select_application_form").slideDown();
	});
});