$(document).ready(function() {

	var cleanUrl = window.location.host + window.location.pathname;

	if(!showtuto)
		return;

	$.fn.powerTip.defaults.placement = 'ne';
	$.fn.powerTip.defaults.smartPlacement = true;
	$.fn.powerTip.defaults.popupClass = 'animate__animated animate__fadeIn';
	$.fn.powerTip.defaults.openEvents = [];
	$.fn.powerTip.defaults.closeEvents = [];

	$('.powertip').each(function() {
		var content = $(this).attr('powertip-content');
		var order = $(this).attr('powertip-order');
		$(this).on({
			powerTipPreRender: function(el) {

				// generate some dynamic content
				$(this).data('powertip' , '\
					<div style="width: 15%;float: left;">\
						<img src="/img/mascot/body.png" alt="Nodea img" class="powertip-nodea">\
					</div>\
					<div style="width: 85%;float:right;padding:5px;">\
						' + content + '\
					</span>\
					<br><br>\
					<div class="text-right">\
						<a href="#" class="powertip-stopit btn btn-danger" data-order="' + order + '">' + stopTutoTrad + '&nbsp;&nbsp;<i class="fas fa-times"></i></a>\
						&nbsp;|&nbsp;\
						<a href="#" class="powertip-gotit btn btn-info" data-order="' + order + '">' + nextTutoTrad + '&nbsp;&nbsp;<i class="fas fa-caret-right"></i></a>\
					</div>');
			}
		});
	});

	// Only show the tip that you didn't click 'understood'
	for (var i = 1; i <= $('.powertip').length; i++) {
		if(localStorage.getItem('nodea-powertip-' + cleanUrl + '-' + i))
			continue;
		$('.powertip[powertip-order="'+ i +'"]').powerTip().powerTip('show');
		break;
	}

	$(document).on('click', '.powertip-gotit', function() {
		$.powerTip.hide();
		localStorage.setItem('nodea-powertip-' + cleanUrl + '-' + $(this).attr('data-order'), true);
		var nextOrder = parseInt($(this).attr('data-order')) + 1;
		$('.powertip[powertip-order="'+ nextOrder +'"]').powerTip().powerTip('show');
	});

	$(document).on('click', '.powertip-stopit', function() {
		$.powerTip.hide();
		showtuto = false;
		$.ajax({
			url: '/account/skiptuto',
			method: 'GET'
		})
	});
});