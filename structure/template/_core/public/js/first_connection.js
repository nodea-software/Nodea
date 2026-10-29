const passwordRegex = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&?*]).{12,120}$/);

$(function () {
	const updateConfirmPasswordBorder = () => {
		if ($("#confirm_password").val()) {
			if ((passwordRegex.test($("#confirm_password").val()) || env === "develop") && $("#confirm_password").val() === $("#password").val()) {
				$("#confirm_password").css("border-color", "green");
				$("#confirm_password").next(".password-toggle").css("border-color", "green green green lightgray");
			} else {
				$("#confirm_password").css("border-color", "red");
				$("#confirm_password").next(".password-toggle").css("border-color", "red red red lightgray");
			}
		} else {
			$("#confirm_password").css("border-color", "lightgray");
			$("#confirm_password").next(".password-toggle").css("border-color", "lightgray");
		}
	};

	function isValidPassword(p1, p2) {
		if (!p1 || p1 !== p2) return false;
		if (env === "develop") return true;
		if (!passwordRegex.test(p1)) return false;
		return true;
	}

	$(document).on("keyup", "#password", function () {
		if ($(this).val()) {
			if (passwordRegex.test($(this).val()) || env === "develop") {
				$("#password").css("border-color", "green");
				$("#password").next(".password-toggle").css("border-color", "green green green lightgray");
			} else {
				$("#password").css("border-color", "red");
				$("#password").next(".password-toggle").css("border-color", "red red red lightgray");
			}
		} else {
			$("#password").css("border-color", "lightgray");
			$("#password").next(".password-toggle").css("border-color", "lightgray");
		}
		updateConfirmPasswordBorder();
	});

	$(document).on("keyup", "#confirm_password", () => updateConfirmPasswordBorder());

	$(document).on("submit", "#first_connection, #reset_password", () => {
		if ($('input[name="email"]').val() == "" || !$('input[name="email"]').inputmask("isComplete")) {
			$('input[name="email"]').css("border-color", "red");
			return false;
		}

		if (!isValidPassword($("#password").val(), $("#confirm_password").val())) {
			$("#error-box")
				.addClass("bg-danger")
				.html("<i class='fa fa-exclamation-circle'></i><br>" + errorMessagePassword)
				.show();
			return false;
		}

		return true;
	});
});
