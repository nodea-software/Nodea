$(function() {

	$(document).on('click', '.login-help', function() {
		doModal($(this).data('title'), $(this).data('content'));
	});

	$("input[data-type='email']").inputmask({
		alias: "email"
	});

	// Handling toastr message
	for (var i = 0; i < toastrArray.length; i++) {
		switch (toastrArray[i].level) {
			case "info":
				$('#error-box').addClass('bg-primary').html("<i class='fa fa-info-circle'></i><br>" + toastrArray[i].message).show();
				break;
			case "success":
				$('#error-box').addClass('bg-success').html("<i class='fa fa-check-circle'></i><br>" + toastrArray[i].message).show();
				break;
			case "warning":
				$('#error-box').addClass('bg-warning').html("<i class='fa fa-exclamation-triangle'></i><br>" + toastrArray[i].message).show();
				break;
			case "error":
				$('#error-box').addClass('bg-danger').html("<i class='fa fa-exclamation-circle'></i><br>" + toastrArray[i].message).show();
				break;
		}
	}
});

/* Generate and open a modal */
function doModal(title, content) {
	$('#tmp_text_modal').remove();
	var modal_html = '\
	<div id="tmp_text_modal" class="modal fade" tabindex="-1" role="dialog">\
		<div class="modal-dialog modal-dialog-centered modal-lg" role="document">\
			<div class="modal-content">\
				<div class="modal-header">\
					<h4>' + title + '</h4>\
					<button type="button" class="close" data-dismiss="modal" aria-label="Close">\
						<span aria-hidden="true">&times;</span>\
					</button>\
				</div>\
				<div class="modal-body">\
					<p>' + content.replace(/(?:\r\n|\r|\n)/g, '<br>') + '</p>\
				</div>\
				<div class="modal-footer">\
					<span class="btn btn-default" data-dismiss="modal">\
						Fermer\
					</span>\
				</div>\
			</div>\
		</div>\
	</div>';
	$("body").append(modal_html);
	$("#tmp_text_modal").modal();
}