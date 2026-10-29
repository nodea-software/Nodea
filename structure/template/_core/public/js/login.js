document.addEventListener("DOMContentLoaded", function () {
	document.querySelectorAll(".password-toggle").forEach(function (toggle) {
		const input = toggle.closest(".input-icon-right").querySelector("input[type='password'], input[type='text']");
		const icon = toggle.querySelector("i");

		toggle.addEventListener("click", function () {
			const isPassword = input.type === "password";
			input.type = isPassword ? "text" : "password";

			icon.classList.toggle("fa-eye");
			icon.classList.toggle("fa-eye-slash");
		});
	});
});
