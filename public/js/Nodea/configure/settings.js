$(function () {
	$(document).on("click", ".chooseLanguage", function () {
		$.ajax({
			url: '/configure/settings/change_language',
			type: 'POST',
			data: JSON.stringify({
				lang: $(this).data("lang")
			}),
			dataType: 'json',
			contentType: "application/json",
			context: this,
			success: function (data) {
				if (data.success)
					location.reload();
			},
			error: function (error) {
				console.error(error);
				toastr.error(error);
			}
		});
	});

	$(document).on("click", ".darkTheme", function () {
		$.ajax({
			url: '/configure/settings/change_theme',
			type: 'POST',
			data: JSON.stringify({
				choice: $(this).data("choice")
			}),
			dataType: 'json',
			contentType: "application/json",
			context: this,
			success: function (data) {
				if (data.success)
					location.reload();
			},
			error: function (error) {
				console.error(error);
				toastr.error(error);
			}
		});
	});

	$(document).on("click", "#reset_tuto", function () {
		const powertips_storage = {...localStorage};
		for (const key in powertips_storage) {
			if(!key.startsWith('nodea-powertip'))
				continue;
			localStorage.removeItem(key);
		}
		toastr.success(reset_tuto_ok);
	});
});