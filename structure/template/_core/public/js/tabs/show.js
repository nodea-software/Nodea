$(function() {
	var tab = NodeaTabs.current.tab;
	tab.find('.cancel').click(NodeaTabs.closeOverlay);
	NodeaForms(tab);
});