$(function () {
	$(".collapse").on("show.bs.collapse", function (e) {
		const group = $(this).data("ldap-group");
		const uuid = $(this).attr("id");
		if (!group) return;
		$.ajax({
			url: "/ldap/get-group-settings",
			mehtod: "GET",
			data: { group },
			success: function (data) {
				if (data && data.html) {
					$("#" + uuid)
						.empty()
						.append(data.html)
						.show();
					$("input[type='checkbox']", data.html).icheck({
						checkboxClass: "icheckbox_flat-blue",
						disabledClass: "",
					});
				}
			},
			error: function () {},
		});
	});

	$("button.save").on("click", function (e) {
		e.preventDefault();
		e.stopPropagation();
		const fields = $("#fields");
		const data = {};
		data.give_access_to_all_groups = fields.find("input[name='give_access_to_all_groups']").is(":checked");
		data.update_user_groups_on_login = fields.find("input[name='update_user_groups_on_login']").is(":checked");
		data.ldap_groups = [];
		fields.find(".row").each((_, r) => {
			const row = $(r);
			const name = row.closest(".collapse").data("ldap-group");
			const access = row.find("input[name='access']").is(":checked");

			const groups = row.find(".group");
			const roles = row.find(".role");

			const app_groups = [];
			const app_roles = [];

			groups.each((_, g) => {
				const isChecked = $(g).find("input[name='group']").is(":checked");
				if (isChecked) {
					app_groups.push({
						f_label: $(g).data("group-label"),
						id: $(g).data("group-id"),
					});
				}
			});

			roles.each((_, r) => {
				const isChecked = $(r).find("input[name='role']").is(":checked");
				if (isChecked) {
					app_roles.push({
						f_label: $(r).data("role-label"),
						id: $(r).data("role-id"),
					});
				}
			});
			data.ldap_groups.push({
				name,
				access,
				app_groups,
				app_roles,
			});
		});

		$.ajax({
			url: "/ldap/save-settings",
			method: "POST",
			contentType: "application/json",
			data: JSON.stringify(data),
			success: (response) => {
				toastr.success(response.message);
			},
			error: function () {
				toastr.error("Une erreur est survenue");
			},
		});
	});
});
