/* URL Redirection for tabs */
var menu = document.currentScript.getAttribute('menu');
var url = window.location.href;
var current_url = url.split("/");

/* Get menu part of the url */
current_url = current_url.filter(x => x.includes(menu))[0];

if (current_url.includes('#'))
	$(`a.nav-link[href="${current_url.split(menu)[1].replace('_', '')}"]`).trigger('click');

$('.trigger-tab').on('click', function() {
	$(`a.nav-link[href="${$(this).attr('href').replace('_', '')}"]`).trigger('click');
});

/* Trigger tab change on main menu click */
$('#main-menu #' + menu + '-dropdown-nav .dropdown-item').click(function() {
	$(`a.nav-link[href="${$(this).attr('href').split(menu)[1].replace('_', '')}"]`).trigger('click');
});

/* Add #href in url on tab click */
$('.nav-link').on('click', function() {
	window.location.href = window.location.href.split('#')[0] + '#_' + $(this).attr('href').substring(1);
});