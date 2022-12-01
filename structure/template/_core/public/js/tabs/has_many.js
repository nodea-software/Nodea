$(function() {
    var tab = NodeaTabs.current.tab;
	var tableId = tab.find('table').attr('id');
    const newTableID = tableId + '_' + tab.attr('data-asso-alias');
    // Update tableID with association alias to avoid element ID conflict on multiple tabs
    tab.find('table').attr('id', newTableID);
    var table = NodeaTable('#'+newTableID);
});