$(function() {
	/* Init Forms */
	NodeaForms.elements.ajax_select.initializer($("#entity-select-tracking"));

	/* Handle select entity */
	const trackingName = 'traceability';
	$(document).on('change', 'select[name=f_entity]', function(){
		const valueEntity = $(this).find('option:selected').length ? $(this).find('option:selected')[0].textContent : '';
		const originalUrl = $(`#table_e_${trackingName}`).attr('data-url').split('?')[0];
		const filterUrl = originalUrl + (valueEntity ? "?entity=" + valueEntity : '');
		$(`#table_e_${trackingName}`).DataTable().ajax.url(filterUrl);
		$(`#table_e_${trackingName}`).DataTable().ajax.reload();
	});

	/* Overwrite binding columns */
	const datatable = $(`#table_e_${trackingName}`).data('table');
	datatable.tableOptions.columnDefs.map(col => {
		col.binding = (elem) => {
			const parent = $(elem.event.target).parents('tr');
			const id = parent.attr('data-id');
			$.ajax({
				url: `/${trackingName}/show?id=${id}&ajax=true`,
				method: 'GET',
				success: function (result) {
					$('#trackingModal').find('.modal-body').html(result);
					$('#trackingModal').modal('show');
				},
				error: function (err) {
					console.error(err);
				}
			});
		};
	});

	/* Reload tabs for refresh data on tabs click */
	$(document).on('click', '#r_traceability-click', function () {
		datatable.ajax.reload();
	});
});