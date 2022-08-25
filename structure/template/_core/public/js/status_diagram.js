var markerInitialized = false;
var arrowSize = 8;

function clearSvg() {
	$("#svg-canvas").remove();
	markerInitialized = false;
}

function createTriangleMarker() {
	if (markerInitialized)
		return;
	markerInitialized = true;
	var svg = createSVG();
	var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
	svg.appendChild(defs);
	var marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
	marker.setAttribute('id', 'triangle');
	marker.setAttribute('viewBox', '0 0 4 4');
	marker.setAttribute('refX', '0');
	marker.setAttribute('refY', '2');
	marker.setAttribute('markerWidth', '4');
	marker.setAttribute('markerHeight', '4');
	marker.setAttribute('orient', 'auto');
	var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	marker.appendChild(path);
	path.setAttribute('d', 'M 0 0 L 4 2 L 0 4 z');
	defs.appendChild(marker);
}

function drawCircle(x, y, radius, color) {
	var svg = createSVG();
	var shape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	shape.setAttributeNS(null, "cx", x);
	shape.setAttributeNS(null, "cy", y);
	shape.setAttributeNS(null, "r", radius);
	shape.setAttributeNS(null, "fill", color);
	svg.appendChild(shape);
}

function drawCurvedLine(x1, y1, x2, y2, color, tension, side) {
	var svg = createSVG();
	var shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
	if (tension < 0) {
		var delta = (y2 - y1) * tension;
		var hx1 = x1;
		var hy1 = y1 - delta;
		var hx2 = x2;
		var hy2 = y2 + delta;
		if(side == 'left'){
			hx2 += 50;
			x2 -= 15;
		} else if(side == 'right'){
			hx2 -= 50;
		}
		var path = "M " + x1 + " " + y1 +
			" C " + hx1 + " " + hy1 + " " +
			hx2 + " " + hy2 + " " +
			x2 + " " + y2;
	} else {
		var delta = (x2 - x1) * tension;
		var hx1 = x1 + delta;
		var hy1 = y1;
		var hx2 = x2 - delta;
		var hy2 = y2;
		if(side == 'left'){
			hx2 += 50;
			x2 -= 15;
		} else if(side == 'right'){
			hx2 -= 50;
		}
		var path = "M " + x1 + " " + y1 +
			" C " + hx1 + " " + hy1 + " " +
			hx2 + " " + hy2 + " " +
			x2 + " " + y2;
	}

	shape.setAttributeNS(null, "d", path);
	shape.setAttributeNS(null, "fill", "none");
	shape.setAttributeNS(null, "stroke", color);
	shape.setAttributeNS(null, 'stroke-width', 2);
	// shape.setAttributeNS(null, "marker-start", "url(#triangle)");
	shape.setAttributeNS(null, "marker-end", "url(#triangle)");
	svg.appendChild(shape);
	return shape;
}

function createSVG() {
	var svg = document.getElementById("svg-canvas");
	if (null == svg) {
		var drawAbove = $("#diagram-container")[0];
		svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		var svgPos = findSVGCanvasPosition(drawAbove);
		svg.setAttribute('style', 'z-index:1;position:absolute;top:' + svgPos.y + 'px;left:' + svgPos.x + 'px');
		svg.setAttribute('width', drawAbove.offsetWidth);
		svg.setAttribute('height', drawAbove.offsetHeight);
		svg.setAttribute('id', 'svg-canvas');
		svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
		document.body.appendChild(svg);
		createTriangleMarker();
	}
	return svg;
}

function findSVGCanvasPosition(htmlElement) {
	var x = htmlElement.offsetLeft;
	var y = htmlElement.offsetTop;
	for (var x = 0, y = 0, el = htmlElement; el != null; el = el.offsetParent) {
		x += el.offsetLeft;
		y += el.offsetTop;
	}
	return {
		"x": x,
		"y": y
	};
}

// Find box position within diagram container
function findPosition(element, childPos) {
	childPos = childPos ? childPos : $(element).offset();
	if ($(element).parent().attr('id') != 'diagram-container')
		return findPosition($(element).parent(), childPos);
	var parentPos = $(element).parent().offset();
	return {
		y: childPos.top - parentPos.top,
		x: childPos.left - parentPos.left
	}
}

function findConnectionPoints(parent, child) {

	var parent_width = parent.offsetWidth;
	var parent_height = parent.offsetHeight;
	var child_width = child.offsetWidth;
	var child_height = child.offsetHeight;

	var parentPos = findPosition(parent), childPos = findPosition(child);

	parentPos.cx = parentPos.x + parent_width / 2;
	parentPos.cy = parentPos.y + parent_width / 2;
	childPos.cx = childPos.x + parent_width / 2;
	childPos.cy = childPos.y + parent_width / 2;

	var parentPoint = {x: 0,y: 0},
		childPoint = {x: 0,y: 0},
		direction, side;

	// Child below
	if (parentPos.cy < childPos.cy) {
		direction = 'down';
		side = 'center';
		parentPoint.y = parentPos.y + parent_height;
		parentPoint.x = parentPos.x + parent_width / 2;
		childPoint.y = childPos.y - arrowSize;
		childPoint.x = childPos.x + (child_width / 2);
	}
	// Child same height
	else if (parentPos.cy == childPos.cy) {
		direction = 'down';
		// Child on left
		if (parentPos.cx >= childPos.cx) {
			side = 'left';
			parentPoint.y = parentPos.y + parent_height / 2;
			parentPoint.x = parentPos.x;
			childPoint.y = childPos.y + child_height / 2
			childPoint.x = childPos.x + child_width + arrowSize + 15;
		}
		// Child on right
		else if (parentPos.cx < childPos.cx) {
			side = 'right';
			parentPoint.y = parentPos.y + parent_height / 2;
			parentPoint.x = parentPos.x + parent_height;
			childPoint.y = childPos.y + child_height / 2;
			childPoint.x = childPos.x - arrowSize;
		}
	// Child above
	} else {
		direction = 'up';
		side = 'center';
		parentPoint.y = parentPos.y;
		parentPoint.x = parentPos.x + parent_width / 2 + 15;
		childPoint.y = childPos.y + child_height - arrowSize + 15;
		childPoint.x = childPos.x + (child_width / 2) + 15;
	}

	return {
		parent: parentPoint,
		child: childPoint,
		direction: direction,
		side: side
	};
}

// Build statusBox for sidebar/diagram
function buildStatusBox(status, forSidebar) {
	var statusBox;
	if (forSidebar) {
		statusBox = $("#sidebarStatusTemplate > .card").clone()
		statusBox.attr('id', 'sidebar' + status.id);
		statusBox.addClass('sidebarStatus');
		statusBox.find('.card-header').css('border', '0');
		statusBox.find('.card-header').css('text-align', 'center');
	} else {
		statusBox = $("#connectStatusTemplate > .card").clone()
		statusBox.attr('id', 'connect' + status.id);
		statusBox.addClass('connectStatus');
		statusBox.find('.card-header').attr('title', status.f_name);
	}
	statusBox.css('border', '2px solid ' + status.f_color).data("status", status).find(".statusTitle").text(status.f_name);
	return statusBox;
}

function connectDivs(parentId, childId) {

	const $parentId = "connect" + parentId;
	const $childId = "connect" + childId;
	var parent = document.getElementById($parentId);
	var child = document.getElementById($childId);
	if (!parent || !child)
		return;

	// Target itself. Add class that prepend fa-refresh to the statusBox
	// if ($parentId == $childId)
	// 	return $(parent).addClass('status-to-self');
	var points = findConnectionPoints(parent, child);
	var tension = points.direction == 'down' ? -0.2 : -0.9;

	if ($parentId == $childId) {
		tension = 4;
		points.child.x = points.parent.x;
		points.child.y = points.parent.y;
		// points.parent.x -= 10;
		points.parent.y -= 20;
		points.child.x -= 8;
		points.child.y += 30;
		points.side = 'right';
	}

	var color = $(parent).data('status').f_color;
	if(color.startsWith('#fff'))
		color = '#333';
	drawCircle(points.parent.x, points.parent.y, 4, color);
	const shape = drawCurvedLine(points.parent.x, points.parent.y, points.child.x, points.child.y, color, tension, points.side);
	return shape;
}

function buildDiagram(data, entity, field) {
	// Build status tree by pushing each child to its parent
	for (var i = 0; i < data.connections.length; i++) {
		var parent, child;
		// Find parent and child status
		for (var j = 0; j < data.statuses.length; j++) {
			if (data.statuses[j].id == data.connections[i].fk_id_parent_status)
				parent = data.statuses[j];
			else if (data.statuses[j].id == data.connections[i].fk_id_child_status)
				child = data.statuses[j]
		}
		// Push child to parent
		if (parent && child) {
			if (!parent.r_children)
				parent.r_children = [];
			// Avoid duplicates
			if (parent.r_children.filter(x => x.id == child.id).length === 0)
				parent.r_children.push(child);
		}
	}

	var rootStatus;
	for (var i = 0; i < data.statuses.length; i++) {
		if (!rootStatus && data.statuses[i].f_default == true)
			rootStatus = data.statuses[i];
	}

	if (!rootStatus)
		return;

	var rows = [
		[rootStatus]
	];

	// Keep unicity of status in rows, keeping the higher (closest to default status) level found.
	function exists(element, level) {
		var doExists = {
			found: false,
			spliced: false
		};
		for (var i = 0; i < rows.length; i++)
			for (var j = 0; j < rows[i].length; j++) {
				if (rows[i][j].id == element.id) {
					doExists.found = true;
					if (rows[i][j].id == element.id && i > level) {
						doExists.spliced = true;
						rows[i].splice(j, 1);
					}
				}
			}
		return doExists;
	}

	// Parse data and organize status by row
	function buildRows(parentId, element, level) {
		for (var i = 0; element && i < element.length; i++) {
			if (!rows[level])
				rows[level] = [];
			var exi = exists(element[i], level);
			if (!exi.found || exi.spliced) {
				rows[level].push(element[i]);
			}
			if (!exi.found)
				buildRows(element[i].id, element[i].r_children, level + 1);
		}
	}

	buildRows(rootStatus.id, rootStatus.r_children, 1);

	// Create status diagram html
	for (var i = 0; i < rows.length; i++) {
		var row = $('<div style="margin-bottom: 50px;" class="row text-center"></div>');
		for (var j = 0; j < rows[i].length; j++) {
			var statusBox = buildStatusBox(rows[i][j]);
			row.append(statusBox);
		}
		$("#diagram-container").append(row);
	}

	// Connect boxes
	for (var i = 0; i < data.connections.length; i++) {
		const parent_id = data.connections[i].fk_id_parent_status;
		const child_id = data.connections[i].fk_id_child_status;
		const shape = connectDivs(parent_id, child_id);

		// Bind click on line draw to enable removing it
		$(shape).css('cursor', 'pointer');
		$(shape).on('click', function(){
			if(!confirm(locales.button.delete_confirm))
				return;

			$.ajax({
				url: '/status/remove_children_diagram',
				method: 'post',
				data: {
					id: parent_id,
					child: child_id
				},
				success: function() {
					clearSvg();
					dragAndDropStatus(entity, field);
				}
			})
		});
	}
}

function dragAndDropStatus(entity, field) {
	$.ajax({
		url: '/status/diagramdata',
		method: 'post',
		data: {
			f_entity: entity,
			f_field: field
		},
		success: function(data) {
			clearSvg();
			$("#statusList").html('');
			$("#diagram-container").html('');

			// Build diagram html and svg
			buildDiagram(data, entity, field);

			// Build status sidebar list
			for (var i = 0; i < data.statuses.length; i++)
				$("#statusList").append(buildStatusBox(data.statuses[i], true));

			// Sidebar draggable statusBox
			function initDraggable(statusBox) {
				statusBox.draggable({
					cursor: "crosshair",
					snap: true,
					snapMode: 'inner',
					revert: 'invalid',
					stack: '.connectStatus',
					containment: $("#drag-drop-container"),
					start: function(event, ui) {},
					stop: function(event, ui) {}
				});
			}

			$(".sidebarStatus").each(function() {
				initDraggable($(this));
			});

			// Diagram droppable statusBox
			function initDroppable(statusBox) {
				statusBox.droppable({
					over: function(event, ui) {},
					out: function(event, ui) {},
					snap: true,
					snapMode: 'inner',
					// Check if connection already exists
					accept: function(dropped) {
						var newConnection = {
							parent: statusBox.data('status').id,
							child: dropped.data('status').id
						};
						for (var i = 0; i < data.connections.length; i++)
							if (data.connections[i].fk_id_parent_status == newConnection.parent &&
								data.connections[i].fk_id_child_status == newConnection.child)
								return false;
						return true;
					},
					// Add new status connection and redraw
					drop: function(event, ui) {
						var newConnection = {
							parent: statusBox.data('status').id,
							child: ui.helper.data('status').id
						};
						$.ajax({
							url: '/status/set_children_diagram',
							method: 'post',
							data: newConnection,
							success: function() {
								clearSvg();
								dragAndDropStatus(entity, field);
							}
						})
					}
				})
			}

			$(".connectStatus").each(function() {
				initDroppable($(this));
			});

			// Delete status connections and redraw
			$(".removeStatus").on('click', function() {
				if(!confirm(locales.button.delete_confirm))
					return;

				$.ajax({
					url: '/status/remove_children_diagram',
					method: 'post',
					data: {
						id: $(this).parents('.card').data('status').id
					},
					success: function() {
						clearSvg();
						dragAndDropStatus(entity, field);
					}
				})
			});

			$(document).on('click', '.showStatus', function() {
				window.open('/status/show?id=' + $(this).parents('.card').data('status').id, '_blank');
			});
		}
	});
}