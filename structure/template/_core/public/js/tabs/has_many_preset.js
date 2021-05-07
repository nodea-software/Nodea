$(function() {
	const tab = NodeaTabs.current.tab;
	const tableId = tab.find('table').attr('id');
	const fieldsetSelect = tab.find('select.fieldset-select');

	NodeaForms.elements.ajax_select.initializer(fieldsetSelect);
    NodeaTable('#' + tableId, {
    	columns: {
    		update: {
				render: ({value, row, column, entity, additionalData}) => {
					return '';
				},
    			hidden: true,
    			searchable: false,
    			orderable: false
    		},
    		delete: {
    			render: ({value, row, column, entity, additionalData}) => {
					var form = `
					<form class="ajax" action="/${tab[0].dataset.assoUrl}/fieldset/${tab[0].dataset.assoAlias}/remove" method="POST" style="float: left;text-align: center;">
						<input name="idEntity" type="hidden" value="${tab[0].dataset.assoFlag}" />
						<input name="idRemove" type="hidden" value="${row.id}" />
						<button class="btn btn-danger btn-confirm">
							<i class="fas fa-minus-circle"></i>
						</button>
					</form>`;
					return form;
				},
    			searchable: false,
    			orderable: false
			}
		}
    });

    $(document).on('submit', '.fieldset-add', function(e) {
    	e.preventDefault();
    	$.ajax({
    		url: $(this).attr('action'),
    		method: 'POST',
    		data: $(this).serialize(),
    		success: function(data) {
    			// Clean select2
    			fieldsetSelect.val('').trigger('change');
    			// Reload datatable
    			$('#' + tableId).DataTable().ajax.reload();
    		},
    		error: function(err) {
    			console.error(err);
    			toastr.error(err);
    		}
    	})
    });
});