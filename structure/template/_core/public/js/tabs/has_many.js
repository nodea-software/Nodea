$(function() {
    var tab = NodeaTabs.current.tab;
	var tableId = tab.find('table').attr('id');

    var table = NodeaTable('#'+tableId);
});