$(function() {
    var tab = NodeaTabs.current.tab;
	var tableId = tab.find('table').attr('id');
    var table = NodeaTable('#'+tableId);

	NodeaForms(tab, {
		elements: {
			file: {
				initializer: element => {
					NodeaForms.elements.file.initializer(element);
					const input = element.parents('.form-group').find('input[type=file]');
					input.on('change', function() {
						const form = element.parents('form');
						form.submit();
					});
				}
			}
		}
	});
});