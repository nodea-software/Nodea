let startPowertips = () => null;
$(function() {

	const origin_url = window.location.pathname;
	let show_tuto = !localStorage.getItem('nodea-powertip-disable');

	if(!show_tuto)
		return;

	$.fn.powerTip.defaults.placement = 'ne';
	$.fn.powerTip.defaults.smartPlacement = true;
	$.fn.powerTip.defaults.popupClass = 'animate__animated animate__fadeIn';
	$.fn.powerTip.defaults.openEvents = [];
	$.fn.powerTip.defaults.closeEvents = [];

	$('.powertip').each(function() {
		const content = $(this).attr('powertip-content');
		const order = $(this).attr('powertip-order');
		let save_border_css;
		$(this).on({
			powerTipPreRender: el => {

				// Generate some dynamic content
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
			},
			powerTipOpen: el => {
				save_border_css = $(this).css('border')
				$(this).css('border', '2px solid #eaeaea');
				$(this).addClass('animate__animated animate__pulse');
			},
			powerTipClose: el => {
				$(this).css('border', save_border_css);
			}
		});
	});

	startPowertips = function() {
		for (var i = 1; i <= $('.powertip').length; i++) {
			// Only show the tip that you didn't click 'understood'
			if(localStorage.getItem('nodea-powertip-' + origin_url + '-' + i))
				continue;
			$('.powertip[powertip-order="'+ i +'"]').powerTip().powerTip('show');
			break;
		}
	}

	$(document).on('click', '.powertip-gotit', function() {
		$.powerTip.hide();
		localStorage.setItem('nodea-powertip-' + origin_url + '-' + $(this).attr('data-order'), true);
		const nextOrder = parseInt($(this).attr('data-order')) + 1;
		$('.powertip[powertip-order="'+ nextOrder +'"]').powerTip().powerTip('show');
	});

	$(document).on('click', '.powertip-stopit', function() {
		localStorage.setItem('nodea-powertip-disable', true);
		$.powerTip.hide();
	});
});