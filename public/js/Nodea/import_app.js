/* ------- IMPORT APPLICATION --------- */
$(document).on('submit', '#importForm', function(){
	$(this).find('#importSubmit').text(loadingText).prop('disabled', true);

	var formData = new FormData($(this)[0]);
    var filename = $(this).find('input').val();

    $.ajax({
        url: '/application/import',
        method: 'POST',
        contentType: false,
        processData: false,
        data: formData,
        success: function(data) {
        	console.log('DONE');
        	console.log(data);

        	$('#success_import a').attr('href', '/application/preview/' + data.appName);
        	$('#form_import').hide();

        	$('#infoImport').html('<b>Logs</b>:<br>' + data.infoText);

        	$('#success_import').show();
        	$('#infoImport').show();
            // $("#progressbarcontent").show();
            // if (user_lang == 'en-EN')
            //     $("#filename").text('Executing instructions...');
            // else if (user_lang == 'fr-FR')
            //     $("#filename").text('Exécution des instructions du fichier...');
            // setTimeout(fetchStatus, 50);
        },
        error: function(err) {
            console.error(err);
        }
    });

	return false;
});

$(document).on("keyup", "input[name='appname']", function() {

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