$(document).ready(function() {

	// Role toggle switch aid
	$('.toggle-checks-td').each(function(){
		var elements = $(this).parents('td').find('input[type=checkbox]:not(.toggle-checks-td):not(.toggle-checks-tr)');
		for (var i = 0; i < elements.length; i++) {
			if(!$(elements[i]).icheck('update')[0].checked)
				return;
		}
		$(this).data('state', '1').trigger('click', true);
	});

	$('.toggle-checks-tr').each(function(){
		var elements = $(this).parents('tr').find('input[type=checkbox].toggle-checks-td');
		for (var i = 0; i < elements.length; i++) {
			if($(elements[i]).data('state') == 0)
				return;
		}
		$(this).data('state', '1').trigger('click', true);
	});

	$(document).on('click', '.toggle-checks-td', function(event, ignore) {
		if(ignore)
			return;

		var that = $(this);
		$(this).parents('td').find('input[type=checkbox]:not(.toggle-checks-td):not(.toggle-checks-tr)').each(function() {
			if(that.data('state') == '0'){
				$(this).icheck('checked');
			} else {
				$(this).icheck('unchecked');
			}
		});
		$(this).data('state', that.data('state') == '0' ? '1' : '0');
	});

	$(document).on('click', '.toggle-checks-tr', function() {
		var that = $(this);
		$(this).parents('tr').find('input[type=checkbox]:not(.toggle-checks-td):not(.toggle-checks-tr)').each(function() {
			if(that.data('state') == '0'){
				$(this).icheck('checked');
			} else {
				$(this).icheck('unchecked');
			}
		});

		$(this).data('state', $(this).data('state') == '0' ? '1' : '0');

		var elements = $(this).parents('tr').find('input[type=checkbox].toggle-checks-td');
		for (var i = 0; i < elements.length; i++) {
			if($(this).data('state') == '0'){
				if($(elements[i]).data('state') == '1')
					$(elements[i]).data('state', '0').trigger('click', true);
			} else {
				if($(elements[i]).data('state') == '0')
					$(elements[i]).data('state', '1').trigger('click', true);
			}
		}
	});

	$(".apiOn, .apiOff").click(function() {
		let enable;
		if ($(this).hasClass('apiOn')) {
			enable = true;
		}
		else {
			enable = false;
		}
		$.ajax({
			url: '/access_settings/enable_disable_api',
			method: 'post',
			data: {enable: enable},
			success:function() {
				if (enable) {
					$(".apiOn").removeClass('btn-default').addClass('btn-primary');
					$(".apiOff").addClass('btn-default').removeClass('btn-primary');
					toastr.success('API enabled');
				}
				else {
					$(".apiOn").addClass('btn-default').removeClass('btn-primary');
					$(".apiOff").removeClass('btn-default').addClass('btn-primary');
					toastr.success('API disabled');
				}
			}
		});
	});
});