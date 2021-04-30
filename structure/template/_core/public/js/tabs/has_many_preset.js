$(function() {
	var tab = NodeaTabs.current.tab;
	var tableId = tab.find('table').attr('id');

	NodeaForms.elements.ajax_select.initializer(tab.find('select:eq(0)'));
    NodeaTable('#'+tableId);
});