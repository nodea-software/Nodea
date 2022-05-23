$(function(){

	function isValidPassword(string, confirmString) {

		if (!string || string == '')
			return false;

		if(globalConfEnv == 'develop')
			return true;

		if (string.length < 8)
			return false;

		if (!passwordRegex.test(string))
			return false;

		if (confirmString != '' && confirmString != string)
			return false;

		return true;
	}

	$(document).on("keyup", "#password", function() {
		if (isValidPassword($(this).val(), $("#confirm_password").val())) {
			$(this).attr("style", "border: 1px solid green !important; border-color: green !important;");
			if (isValidPassword($("#confirm_password").val(), $(this).val()))
				$("#confirm_password").attr("style", "border: 1px solid green !important; border-color: green !important;");
		} else {
			$(this).attr("style", "border: 1px solid red !important; border-color: red !important;");
		}
	});

	$(document).on("keyup", "#confirm_password", function() {
		if (isValidPassword($(this).val(), $("#password").val())) {
			$(this).attr("style", "border: 1px solid green !important; border-color: green !important;");
			if (isValidPassword($("#password").val(), $(this).val()))
				$("#password").attr("style", "border: 1px solid green !important; border-color: green !important;");
		} else {
			$(this).attr("style", "border: 1px solid red !important; border-color: red !important;");
		}
	});

	$(document).on("blur", "input[name='login']", function() {
		if($(this).val() != 'admin'){
			$('input[name="email"]').removeAttr('readonly');
			return;
		}

		// Autofill email when admin login in entered
		if (globalConfEnv == 'develop')
			$('input[name="email"]').val('admin@local.fr');
		else
			$('input[name="email"]').val(window.location.host.split('.')[0] + '-admin@nodea-software.com');

		$('input[name="email"]').attr('readonly', 'readonly');
	});

	$(document).on("submit", "#first_connection", function() {

		if ($('input[name="email"]').val() == '' || !$('input[name="email"]').inputmask("isComplete")) {
			$('input[name="email"]').css("border", "1px solid red");
			return false;
		}

		if (globalConfEnv != 'develop' && !isValidPassword($("#password").val(), $("#confirm_password").val())) {
			if($('.body.bg-red').length != 0)
				$('.body.bg-red').remove();
			$('.body.bg-white').after("<div class='body bg-red text-center'><i class='fa fa-exclamation-circle'></i>&nbsp;&nbsp;" + notMatchPasswordText + "</div>");
			return false;
		}

		return true;
	});
});