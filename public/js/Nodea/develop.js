$(function() {
	$('.select2').select2();
	$(document).on('change', 'select#develop_current_app', function() {
		window.location.href = '/develop?app_name=' + $(this).val();
	});

	if(!projectID) {
		$('.tab-content').find('#home, #backlog, #mytasks, #versioning').find('button').each(function(){
			$(this).prop('disabled', true);
		});
		$('.tab-content').find('#home, #backlog, #mytasks, #versioning').find('a').each(function(){
			$(this).attr('href', '#');
			$(this).hide();
		});
		return;
	}

	$(document).on('click', '#new-issue-trigger', function() {
		if($('#newIssue .modal-body input[name="title"]').val() == '') {
			$('#newIssue .modal-body input[name="title"]').addClass('animate__animated animate__shakeX');
			setTimeout(function() {
				$('#newIssue .modal-body input[name="title"]').removeClass('animate__animated animate__shakeX')
			}, 800);
			return;
		}

		$.ajax({
			url: '/develop/new-issue',
			method: 'POST',
			data: {
				projectID: projectID,
				title: $('#newIssue .modal-body input[name="title"]').val(),
				labels: $('#newIssue .modal-body select[name="labels"]').val(),
				description: $('#newIssue .modal-body textarea[name="description"]').val(),
				assignto: [$('#newIssue .modal-body select[name="assignto"]').val()]
			},
			success: function(data) {
				$('#newIssue').modal('hide');
				$('#newIssue .modal-body input[name="title"]').val('');
				$('#newIssue .modal-body select[name="labels"]').val('').trigger('change');
				$('#newIssue .modal-body textarea[name="description"]').val('');
				$('#newIssue .modal-body select[name="assignto"]').val('').trigger('change');
				$("#issues").DataTable().ajax.reload();
				toastr.success(CREATE_ISSUE_SUCCESS);
			},
			error: function(err) {
				console.error(err);
				toastr.error(err.message || 'Sorry, an error occured.');
			}
		})
	});

	$(document).on('click', '#new-tag-trigger', function() {
		$.ajax({
			url: '/develop/new-tag',
			method: 'POST',
			data: {
				projectID: projectID,
				title: $('#newTag .modal-body input[name="title"]').val(),
				description: $('#newTag .modal-body textarea[name="description"]').val(),
				commit: $('#newTag .modal-body select[name="commit"]').val()
			},
			success: function(data) {
				location.reload();
			},
			error: function(err) {
				console.error(err);
				toastr.error(err.message || 'Sorry, an error occured.');
			}
		})
	});

	var dataTableOpt = {
		ajax: {
			url: '/develop/get-issues',
			type: 'POST',
			data: function(d, el) {
				d.projectID = projectID;
				if($(el.nTable).attr('id') == 'mytasks')
					d.mytasks = true;
				return d;
			}
		},
		columns: [{
			data: 'id'
		}, {
			data: 'title'
		}, {
			data: 'description'
		}, {
			data: 'created_at'
		}, {
			data: 'labels'
		}, {
			data: 'assignees'
		}, {
			data: 'state'
		}, {
			data: 'web_url'
		}],
		columnDefs: [{
			targets: 3,
			render: function(data, type, row, meta) {
				if(user_lang == 'fr-FR')
					return moment.utc(data).format("DD/MM/YYYY HH:mm")
				else
					return moment.utc(data).format("YYYY-MM-DD HH:mm")
			}
		}, {
			targets: 4,
			render: function(data, type, row, meta) {
				var text = '';
				for (var i = 0; i < data.length; i++) {
					text += '\
					<span class="badge badge-secondary">\
						' + data[i] + '\
					</span>';
				}
				return text;
			}
		}, {
			targets: 6,
			render: function(data, type, row, meta) {
				if(data == 'opened')
					return '\
					<span class="badge badge-success">\
						' + ((user_lang == 'fr-FR') ? 'Ouvert' : 'Opened') + '\
					</span>';
				else
					return '\
					<span class="badge badge-dark">\
						' + ((user_lang == 'fr-FR') ? 'Fermé' : 'Closed') + '\
					</span>';
			}
		}, {
			targets: 7,
			render: function(data, type, row, meta) {
				return '\
				<a href="' + data + '" target=_blank class="btn btn-warning">\
					<i class="fas fa-external-link-alt"></i>\
				</a>';
			}
		}],
		language: datatables_translation,
		dom: 'RlBfrtip',
		order: [
			[0, 'desc']
		],
		responsive: true,
		autoWidth: false,
		ordering: true,
		buttons: [{
			extend: 'csvHtml5',
			text: '<i class="fas fa-file-csv"></i>',
			titleAttr: 'CSV',
			exportOptions: {
				columns: ':visible'
			}
		}, {
			extend: 'excelHtml5',
			text: '<i class="fas fa-file-excel"></i>',
			titleAttr: 'Excel',
			exportOptions: {
				columns: ':visible'
			}
		}, {
			text: '<i class="fas fa-sync-alt"></i>',
			titleAttr: 'Refresh',
			action: (event, datatable, button, config) => {
				$("#issues").DataTable().ajax.reload();
			}
		}]
	};

	$("table#issues").DataTable(dataTableOpt);
	$("table#mytasks").DataTable(dataTableOpt);

	// Documentation tab, check if core and app documentation are already generated
	$('a.nav-link[href="#documentation"]').on('click', function() {
		console.log(currentApp);
	});
})